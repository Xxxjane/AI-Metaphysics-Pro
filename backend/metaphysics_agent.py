import os
import json
import asyncio
import random
import logging
import traceback
from typing import Annotated, TypedDict, List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# LangGraph 核心
from langgraph.graph import StateGraph, END
# 最新 Google GenAI SDK
from google import genai
from google.genai import errors, types
import httpx

# --- 0. 环境与日志配置 ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("XuanTu")
load_dotenv()

# --- [开源优化项 1] 网络代理配置 ---
# 不要硬编码代理，改由 .env 传入。如果用户没配，则不使用代理。
http_proxy = os.getenv("HTTP_PROXY")
https_proxy = os.getenv("HTTPS_PROXY")
if http_proxy:
    os.environ["HTTP_PROXY"] = http_proxy
if https_proxy:
    os.environ["HTTPS_PROXY"] = https_proxy

# 初始化客户端
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY") or "")
YUANFENJU_KEY = os.getenv("PAIPAN_API_KEY")
# 注：请确保此模型名称与您当前账号拥有权限的模型一致
MODEL_NAME = "gemini-3.1-pro-preview" 

# 信号量控制：降低并发压力，防止触发 Rate Limit
gemini_semaphore = asyncio.Semaphore(2)

# 安全设置：防止误触发内容审核导致生成中断
SAFETY_SETTINGS = [
    types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
]

# --- 1. RAG 本地知识库初始化 ---
collection = None
try:
    import chromadb
    from chromadb.utils import embedding_functions
    db_path = "./metaphysics_db"
    if os.path.exists(db_path):
        db_client = chromadb.PersistentClient(path=db_path)
        emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="paraphrase-multilingual-MiniLM-L12-v2"
        )
        collection = db_client.get_or_create_collection(name="numerology_books", embedding_function=emb_fn)
        logger.info("[System] RAG 知识库已加载。")
except Exception as e:
    logger.warning(f"[Warning] RAG 加载跳过: {e}")

# --- 2. 数据模型定义 ---

class AgentState(TypedDict):
    user_req: Dict[str, Any]
    raw_data: Dict[str, Any] 
    bazi_report: str
    qimen_report: str
    astro_report: str
    final_report: str
    rag_context: str

class ProUserRequest(BaseModel):
    name: str; gender: str; year: int; month: int; day: int; hours: int; minute: int
    province: str; city: str; focus_area: str

class ChatRequest(BaseModel):
    message: str; history: List[Dict[str, str]]
    raw_data: Dict[str, Any]; report_context: str

# --- 3. 核心工具函数 ---

def get_rag_knowledge(query_text: str, n: int = 2) -> str:
    """从本地向量库检索古籍片段"""
    if not collection: return ""
    try:
        results = collection.query(query_texts=[query_text], n_results=n)
        return "\n".join(results['documents'][0]) if results['documents'] else ""
    except: return ""

async def call_insight_ai(prompt: Any, role_instruction: str, context: str = "", use_search: bool = True):
    """
    加固后的 AI 调用：整合 RAG 注入、联网搜索、重试逻辑、安全配置
    """
    kb_prefix = f"\n【参考典籍资料】：\n{context}\n" if context else ""
    
    # --- 提示词内容未做改动 ---
    base_system = (
        "你是一位精通命理的专家。"
        f"{kb_prefix}"
        "核心准则：\n"
        "1. 以事实为依据：必须引用原始数据中的具体干支、神煞、宫位、星体相位等等作为论据。\n"
        "2. 因果推导：结论必须对应现实生活中的具体职业选择、情感方向、财富盈亏或人际关系等等。\n"
        "3. 严禁话术：禁止使用‘史诗’、‘灵魂’、‘能量’等抽象词汇。可以适度宽慰，但鼓励必须有理有据。\n"
        "4. 深刻性：挖掘命主性格中深层矛盾，并给出具体的破局策略。\n"
        "5. 输出风格硬约束：禁用‘共振’、‘撕裂’、‘内耗’等虚词；文风理性、务实。"
    )

    combined_system = f"{base_system}\n{role_instruction}"
    tools = [{"google_search": {}}] if use_search else []

    async with gemini_semaphore:
        retries = 0
        while retries < 3: 
            try:
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=MODEL_NAME,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=combined_system,
                        temperature=0.6,
                        max_output_tokens=8192,
                        tools=tools,
                        safety_settings=SAFETY_SETTINGS # 注入安全策略
                    )
                )
                return response.text
            except Exception as e:
                err_str = str(e).lower()
                if any(x in err_str for x in ["429", "limit", "reset", "disconnect"]):
                    wait_time = (retries * 8) + random.uniform(2, 5)
                    logger.warning(f"[Retry] API 繁忙，{wait_time:.1f}s 后重试...")
                    await asyncio.sleep(wait_time)
                    retries += 1
                else:
                    raise e
        return "天机流转由于网络并发受阻，请稍后重试。"

# --- 4. LangGraph 节点逻辑 ---

async def fetcher_node(state: AgentState):
    logger.info("[System] 提取全维度命盘数据...")
    u = state["user_req"]
    params = {
        "api_key": YUANFENJU_KEY, "name": u["name"], 
        "sex": 1 if ("女" in u["gender"] or "坤" in u["gender"]) else 0, "type": 1,
        "year": u["year"], "month": u["month"], "day": u["day"],
        "hours": u["hours"], "minute": u["minute"],
        "zhen": 1, "province": u["province"], "city": u["city"]
    }
    async def fetch_api(path):
        async with httpx.AsyncClient(trust_env=True, timeout=60.0) as c: # 延长排盘超时
            try:
                r = await c.post(f"https://api.yuanfenju.com/index.php/v1/{path}", data=params)
                return r.json().get("data")
            except: return None
    
    results = await asyncio.gather(fetch_api("Bazi/paipan"), fetch_api("Liupan/qimendunjia"), fetch_api("Liupan/xingpan"))
    if not results[0]: raise ValueError("排盘 API 无响应。")
    
    local_info = get_rag_knowledge(f"{u['focus_area']} 命理格局分析")
    return {"raw_data": {"bazi": results[0], "qimen": results[1], "astro": results[2]}, "rag_context": local_info}

async def experts_panel_node(state: AgentState):
    """三大专家并行产出核心素材"""
    logger.info("[Insight] 专家同步会诊中 (错峰模式)...")
    raw = state["raw_data"]
    context = state["rag_context"]

    async def get_bazi():
        return await call_insight_ai(f"命盘：{json.dumps(raw['bazi'], ensure_ascii=False)}", "你是八字专家，请列出命局核心优劣点与流年关键伏笔（要点形式）。", context)

    async def get_qimen():
        await asyncio.sleep(1) # 错峰执行
        return await call_insight_ai(f"命盘：{json.dumps(raw['qimen'], ensure_ascii=False)}", "你是奇门专家，请指出九宫博弈中的奇点与风险点（要点形式）。", context)

    async def get_astro():
        await asyncio.sleep(2) # 错峰执行
        return await call_insight_ai(f"命盘：{json.dumps(raw['astro'], ensure_ascii=False)}", "你是占星专家，请剥离出行为冲突动机与心理矛盾点（要点形式）。", context)

    res = await asyncio.gather(get_bazi(), get_qimen(), get_astro())
    return {"bazi_report": res[0], "qimen_report": res[1], "astro_report": res[2]}

async def synthesizer_node(state: AgentState):
    """
    首席监稿官：逻辑整合。
    """
    logger.info("[Final] 首席监稿官：执行全维度逻辑整合...")
    u = state["user_req"]
    
    # --- 提示词内容未做改动 ---
    prompt = f"""
    命主：{u['name']}，性别：{u['gender']}，方向：{u['focus_area']}
    
    【专家素材库（精炼版）】：
    - 八字核心论点：{state['bazi_report']}
    - 奇门博弈奇点：{state['qimen_report']}
    - 占星行为动机：{state['astro_report']}
    
    【整合任务】：
    你现在的身份是“玄图实验室首席监稿官”。你需要将上述三方的研究成果整合为一份逻辑缜密、极具洞察力的综合报告。
    
    【报告结构要求】：
    任务：请按照“能量画像、性格深耕、时空指引、大师寄语”模块，整合出一份1500字以上的深度报告。
    2. 【能量画像】：指出其性格特质与命局意象。
    3. 【性格深耕】：剖析内在矛盾、张力点及潜在的性格上下限。
    4. 【时空指引】：针对事业、财富、感情及健康给出破局指导。
    5. 【大师寄语】：一段智慧的结语。
    
    字数要求：1500字以上。文风应智慧、深刻、严谨。
    """
    role = "你是玄图实验室首席监稿官。你不仅是整合者，更是深度洞察者。你需要发现三个体系间的‘共鸣’与‘矛盾’，给出逻辑闭环的深度人生档案。"
    
    # 监稿官节点禁用联网搜索，以减少 API 负载和超时概率
    res = await call_insight_ai(prompt, role, use_search=False, context="")
    return {"final_report": res}

# --- 5. 构建工作流 ---

workflow = StateGraph(AgentState)
workflow.add_node("fetcher", fetcher_node)
workflow.add_node("experts", experts_panel_node)
workflow.add_node("synth", synthesizer_node)

workflow.set_entry_point("fetcher")
workflow.add_edge("fetcher", "experts")
workflow.add_edge("experts", "synth")
workflow.add_edge("synth", END)
chain = workflow.compile()

# --- 6. FastAPI 路由 ---

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/analyze_pro")
async def analyze_pro(req: ProUserRequest):
    init_state = {
        "user_req": req.model_dump(), 
        "raw_data": {}, 
        "bazi_report": "", 
        "qimen_report": "", 
        "astro_report": "", 
        "final_report": "", 
        "rag_context": ""
    }
    try:
        # 延长总超时至 450 秒，并确保 raw_data 能够传递回前端
        result = await asyncio.wait_for(chain.ainvoke(init_state), timeout=450.0)
        return {
            "status": "success", 
            "report": result["final_report"], 
            "raw_data": result["raw_data"] # 确保 raw_data 被返回
        }
    except asyncio.TimeoutError:
        logger.error("!!! LangGraph Execution Timeout !!!")
        raise HTTPException(status_code=504, detail="天机解析过于深奥，系统响应超时，请重试。")
    except Exception as e:
        logger.error(f"Error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="解析冲突，系统正在尝试自动修复。")

@app.post("/chat_pro")
async def chat_pro(req: ChatRequest):
    """深夜茶寮深度追问：完全还原此前逻辑"""
    chat_role = f"""
    你是玄图实验室首席顾问。用户正在针对深度报告进行追问。
    此前报告结论：{req.report_context[:1000]}
    要求：具体回答追问，理性务实，严禁复读报告。
    """
    try:
        reply = await call_insight_ai(req.message, chat_role, use_search=True)
        return {"reply": reply}
    except: return {"reply": "茶寮火微，请换个方式再问。"}

if __name__ == "__main__":
    import uvicorn
    # 增加超时配置以适配超长文本生成
    uvicorn.run(app, host="0.0.0.0", port=8000, timeout_keep_alive=150)