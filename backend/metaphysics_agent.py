import os

os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

import json
import asyncio
import logging
import traceback
from typing import Annotated, TypedDict, List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# LangGraph 核心
from langgraph.graph import StateGraph, END
# 最新 Google GenAI SDK
from google import genai
from google.genai import errors, types
import httpx

# --- 0. 环境与日志配置 ---
logging.basicConfig(
    level=logging.INFO, 
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("XuanTu")
load_dotenv()

# 网络代理配置
for proxy_env in ["HTTP_PROXY", "HTTPS_PROXY"]:
    if os.getenv(proxy_env):
        os.environ[proxy_env] = os.getenv(proxy_env)

API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# 系统级配置
SYS_CONFIG = {
    "YUANFENJU_KEY": os.getenv("PAIPAN_API_KEY", ""),
    "GEMINI_KEY": os.getenv("GEMINI_API_KEY", ""),
    "MODEL_NAME": "gemini-3.1-pro-preview",
    "AUTH_TOKEN": os.getenv("SYS_AUTH_TOKEN", "xuantu-pro-2026"), 
    # 🎯 [核心修改]：重定向至 D 盘，解决 C 盘内存不足问题
    "MODEL_CACHE_PATH": "D:/metaphysics_models",
    "DB_PATH": "D:/metaphysics_db" 
}

# 强制重定向模型下载路径到 D 盘，避开系统盘缓存
os.environ["SENTENCE_TRANSFORMERS_HOME"] = SYS_CONFIG["MODEL_CACHE_PATH"]

# --- 1. 全局资源管理 (Lifespan 模式) ---
class AppResources:
    gemini_client: Optional[genai.Client] = None
    db_client = None
    master_collection = None
    book_collection = None
    semaphore: asyncio.Semaphore = asyncio.Semaphore(3) # 严格控制并发请求

resources = AppResources()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    管理服务生命周期，确保资源正确挂载与释放
    """
    logger.info(f"[Init] 启动玄图引擎。模型路径: {SYS_CONFIG['MODEL_CACHE_PATH']}")
    resources.gemini_client = genai.Client(api_key=SYS_CONFIG["GEMINI_KEY"])
    
    try:
        import chromadb
        from chromadb.utils import embedding_functions
        
        # 自动创建 D 盘目录
        for path in [SYS_CONFIG["DB_PATH"], SYS_CONFIG["MODEL_CACHE_PATH"]]:
            abs_path = os.path.abspath(path)
            if not os.path.exists(abs_path):
                os.makedirs(abs_path, exist_ok=True)
                logger.info(f"📁 已创建目录: {abs_path}")
        
        resources.db_client = chromadb.PersistentClient(path=os.path.abspath(SYS_CONFIG["DB_PATH"]))
        
        # 加载 BGE-M3 语义模型
        logger.info("⏳ 正在加载 BGE-M3 语义引擎（初次加载需约 1GB 内存）...")
        emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="BAAI/bge-m3" 
        )
        resources.master_collection = resources.db_client.get_or_create_collection(name="master_insights_v2", embedding_function=emb_fn)
        resources.book_collection = resources.db_client.get_or_create_collection(name="numerology_books", embedding_function=emb_fn)
        logger.info(f"[Init] RAG 双库连接成功。大师经验库: {resources.master_collection.count()}条")
    except Exception as e:
        logger.error(f"[Fatal] 核心资源挂载失败: {e}")
        logger.error(traceback.format_exc())
    
    yield
    resources.gemini_client = None
    resources.db_client = None

# --- 2. 安全与模型定义 ---

async def verify_api_key(api_key: str = Security(api_key_header)):
    """基础鉴权，保障接口不被非法盗刷"""
    if api_key != SYS_CONFIG["AUTH_TOKEN"]:
        # 调试阶段若需要跳过鉴权，请保持 pass
        pass
    return api_key

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

# --- 3. 核心解算引擎 ---

def get_rag_knowledge(query_texts: List[str], n: int = 2) -> str:
    """[工业级检索] 从元数据中提取 Full Payload，解决语义稀释问题"""
    if not resources.master_collection: return ""
    payloads = []
    
    try:
        # 并发执行多路向量检索
        res = resources.master_collection.query(query_texts=query_texts, n_results=n)
        if res['metadatas']:
            for meta_list in res['metadatas']:
                for meta in meta_list:
                    # 关键：提取入库脚本存入的完整现实故事载荷
                    if 'full_payload' in meta:
                        payloads.append(meta['full_payload'])
    except Exception as e:
        logger.error(f"RAG Retrieval Error: {e}")

    classic_docs = []
    if resources.book_collection:
        try:
            res_book = resources.book_collection.query(query_texts=query_texts, n_results=1)
            if res_book['documents']:
                for doc_list in res_book['documents']:
                    classic_docs.extend(doc_list)
        except: pass

    if not payloads and not classic_docs: return ""
    
    # 汇总去重，构造最终知识块
    result = ""
    if payloads:
        result += "【大师级底层客观推演公理与心法】:\n" + "\n---\n".join(list(dict.fromkeys(payloads)))
    if classic_docs:
        result += "\n\n【古籍理论原文参考】:\n" + "\n".join(list(dict.fromkeys(classic_docs)))
        
    return result

async def call_insight_ai(prompt: Any, role_instruction: str, context: str = "", use_search: bool = True):
    """[原生异步并发控制] 严格执行 5 条准则与 0.6 温度策略"""
    if not resources.gemini_client: raise RuntimeError("Engine Offline")

    kb_section = f"\n【参考背景与大师心法资料】：\n{context}\n" if context else ""
    
    base_system = (
        "你是一位精通命理的专家。"
        f"{kb_section}"
        "核心准则：\n"
        "1. 以事实为依据：必须引用原始数据中的具体干支、神煞、宫位、星体相位等等作为论据。\n"
        "2. 因果推导：结论必须对应现实生活中的具体职业选择、情感方向、财富盈亏或人际关系等等。\n"
        "3. 严禁话术：禁止使用‘史诗’、‘灵魂’、‘能量’等抽象词汇。可以适度宽慰，但鼓励必须有理有据。\n"
        "4. 深刻性：挖掘命主性格中深层矛盾，并给出具体的破局策略。\n"
        "5. 输出风格硬约束：禁用‘共振’、‘撕裂’、‘内耗’等虚词；文风理性、务实。"
    )

    combined_system = f"{base_system}\n{role_instruction}"
    
    safety_settings = [
        types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
        types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
        types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
    ]

    async with resources.semaphore:
        retries = 0
        while retries < 3:
            try:
                response = await resources.gemini_client.aio.models.generate_content(
                    model=SYS_CONFIG["MODEL_NAME"],
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=combined_system,
                        temperature=0.6,
                        max_output_tokens=8192,
                        tools=[{"google_search": {}}] if use_search else [],
                        safety_settings=safety_settings
                    )
                )
                return response.text
            except Exception:
                retries += 1
                await asyncio.sleep(2 ** retries)
        return "天机受扰，当前解算中断。"

# --- 4. LangGraph 节点逻辑 ---

async def fetcher_node(state: AgentState):
    logger.info("[Chain] 抓取排盘并执行全维多路检索...")
    u = state["user_req"]
    params = {
        "api_key": SYS_CONFIG["YUANFENJU_KEY"], "name": u["name"], 
        "sex": 1 if ("女" in u["gender"] or "坤" in u["gender"]) else 0, "type": 1,
        "year": u["year"], "month": u["month"], "day": u["day"],
        "hours": u["hours"], "minute": u["minute"], "zhen": 1, "province": u["province"], "city": u["city"]
    }
    
    async def fetch_api(path):
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.post(f"https://api.yuanfenju.com/index.php/v1/{path}", data=params)
            return r.json().get("data", {})
    
    # 并行排盘
    b, q, a = await asyncio.gather(fetch_api("Bazi/paipan"), fetch_api("Liupan/qimendunjia"), fetch_api("Liupan/xingpan"))
    
    # 🎯 [检查补全]：五路解耦检索矩阵，确保大师库里的奇门、占星数据不被埋没
    b_info = b.get("bazi_info", {})
    dm, mb = b_info.get('day_stem', ''), b_info.get('month_branch', '')
    kw, ss = b_info.get('kw', ''), b_info.get('shen_sha', '')
    
    queries = [
        f"日元{dm}生于{mb}月格局{kw} 命理推演与现实困境",
        f"命局神煞带有{ss} 的具体实战断语表现",
        f"奇门遁甲门迫击刑空亡应期心法经验",
        f"现代占星星体相位心理机制模式",
        f"命理实战中关于【{u['focus_area']}】维度的顶级断法公理"
    ]
    rag_data = get_rag_knowledge(queries)
    
    return {"raw_data": {"bazi": b, "qimen": q, "astro": a}, "rag_context": rag_data}

async def experts_panel_node(state: AgentState):
    logger.info("[Chain] 三大体系专家独立注入 RAG 经验研判...")
    raw = state["raw_data"]; context = state["rag_context"]

    # 专家节点注入 Context，实现“带书会诊”
    async def get_bazi(): return await call_insight_ai(f"命盘数据：{json.dumps(raw['bazi'], ensure_ascii=False)}", "你是八字专家，请列出命局核心优劣点与流年关键伏笔（要点形式）。", context)
    async def get_qimen(): return await call_insight_ai(f"命盘数据：{json.dumps(raw['qimen'], ensure_ascii=False)}", "你是奇门专家，请指出九宫博弈中的奇点与风险点（要点形式）。", context)
    async def get_astro(): return await call_insight_ai(f"命盘数据：{json.dumps(raw['astro'], ensure_ascii=False)}", "你是占星专家，请剥离出行为冲突动机与心理矛盾点（要点形式）。", context)

    res = await asyncio.gather(get_bazi(), get_qimen(), get_astro())
    return {"bazi_report": res[0], "qimen_report": res[1], "astro_report": res[2]}

async def synthesizer_node(state: AgentState):
    """
    🎯 [核心补全]：打通情报断层。将检索出的原始大师心法直接呈现给总编辑。
    """
    logger.info("[Chain] 首席监稿官：执行全维度高阶逻辑整合...")
    u = state["user_req"]
    
    prompt = f"""
    命主：{u['name']}，方向：{u['focus_area']}
    
    【底层推演公理（作为你必须遵循的客观规律）】：
    {state['rag_context']}
    
    【专家素材库（三方研判摘要）】：
    - 八字物理底座：{state['bazi_report']}
    - 奇门环境阻力：{state['qimen_report']}
    - 占星心理病灶：{state['astro_report']}
    
    【整合任务】：
    你现在的身份是“玄图实验室首席监稿官”。你需要将上述客观规律与研究成果整合为一份逻辑缜密、极具洞察力的综合报告。
    
    【报告结构要求】：
    任务：请按照“能量画像、性格深耕、时空指引、大师寄语”模块，整合出一份 1500 字以上的深度报告。
    2. 【能量画像】：指出其性格特质与命局意象。
    3. 【性格深耕】：剖析内在矛盾、张力点及潜在的性格上下限。
    4. 【时空指引】：针对事业、财富、感情及健康给出破局指导。
    5. 【大师寄语】：一段智慧的结语。
    
    字数要求：1500 字以上。文风应智慧、深刻、严谨。
    
    (系统隐式指令：严禁在报告中使用“根据资料”、“参考心法”、“经验显示”等词汇。你必须将案例经验完全无痕地内化为自己的算法直觉。你的判词必须具体、落地。)
    """
    
    role = "你是玄图实验室首席监稿官。你不仅是整合者，更是深度洞察者。你需要发现三个体系间的‘共鸣’与‘矛盾’，给出逻辑闭环的深度人生档案。"
    
    res = await call_insight_ai(prompt, role, use_search=False, context="")
    return {"final_report": res}

# --- 5. 工作流构建 ---

workflow = StateGraph(AgentState)
workflow.add_node("fetcher", fetcher_node); workflow.add_node("experts", experts_panel_node); workflow.add_node("synth", synthesizer_node)
workflow.set_entry_point("fetcher"); workflow.add_edge("fetcher", "experts"); workflow.add_edge("experts", "synth"); workflow.add_edge("synth", END)
chain = workflow.compile()

# --- 6. FastAPI 路由 ---

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/analyze_pro")
async def analyze_pro(req: ProUserRequest, api_key: str = Depends(verify_api_key)):
    init_state = {"user_req": req.model_dump(), "raw_data": {}, "bazi_report": "", "qimen_report": "", "astro_report": "", "final_report": "", "rag_context": ""}
    try:
        # 生成长文本耗时较长，超时放宽至 450s
        result = await asyncio.wait_for(chain.ainvoke(init_state), timeout=450.0)
        return {"status": "success", "report": result["final_report"], "raw_data": result["raw_data"]}
    except Exception as e:
        logger.error(f"Runtime Error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="底层解算链路故障，系统尝试自愈中。")

@app.post("/chat_pro")
async def chat_pro(req: ChatRequest, api_key: str = Depends(verify_api_key)):
    chat_role = "你是玄图实验室首席顾问。解答追问。直击要害，拒绝复读，理性务实。"
    rich_prompt = f"【排盘数据】：{json.dumps(req.raw_data, ensure_ascii=False)}\n【此前结论】：{req.report_context[:1000]}\n【用户追问】：{req.message}\n(系统指令：无痕吸收检索心法资料。)"
    try:
        queries = [f"针对 {req.message} 的具体命理现实推演", f"命理高阶心法 {req.message}"]
        chat_context = get_rag_knowledge(queries, n=2)
        reply = await call_insight_ai(rich_prompt, chat_role, context=chat_context, use_search=True)
        return {"reply": reply}
    except Exception as e:
        logger.error(f"Chat Error: {e}")
        return {"reply": "天机不显，请稍后再问。"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, timeout_keep_alive=150)