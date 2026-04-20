import os
import json
import asyncio
import random
import re
from openai import AsyncOpenAI

# --- 路径配置 ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR)
INPUT_DIR = os.path.join(BASE_DIR, "data", "raw_zhihu")
OUTPUT_FILE = os.path.join(BASE_DIR, "data", "cleaned_cases.jsonl")

# --- DeepSeek 配置 ---
# 请在此填入你的 API Key
DEEPSEEK_API_KEY = "sk-a308fa915a70487998268f0cd607cd62" 
client = AsyncOpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")

# 限制并发：DeepSeek 建议并发不要太高，3-5 比较稳妥
semaphore = asyncio.Semaphore(5)

SYSTEM_PROMPT = """
你是一位命理文化洞察者与数据策展人。
你的任务是从语料中提取【有价值的命理观点、实战案例与分析经验】。

【判定准则】：
1. 涵盖：八字、奇门、星盘、紫微、六爻等严肃命理分析。
2. 提取：案例背景（如：命盘、求测者现状）和大师的核心推导逻辑。
3. 剔除：纯广告、引流请在 insights 填写 "SKIP"。

【输出格式】：
必须输出有效 JSON 格式：
{
  "source_title": "文章标题",
  "case_context": "案例背景描述",
  "insights": "核心命理逻辑或精彩断语"
}
"""

async def refinery_task(file_path, processed_titles):
    """单体炼油任务"""
    file_name = os.path.basename(file_path)
    # 如果标题已经处理过（简单判重），可以跳过
    if file_name in processed_titles:
        return "ALREADY_DONE"

    async with semaphore:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            input_text = content[:6000] # 给 DeepSeek 更多的上下文
            
            retries = 0
            while retries < 3:
                try:
                    response = await client.chat.completions.create(
                        model="deepseek-chat",
                        messages=[
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": f"请提取干货：\n\n{input_text}"}
                        ],
                        response_format={'type': 'json_object'},
                        temperature=0.2
                    )
                    
                    data = json.loads(response.choices[0].message.content)
                    if data.get("insights") == "SKIP":
                        return None
                    
                    # 记录文件名作为 ID
                    data["_file_id"] = file_name
                    return data
                except Exception:
                    retries += 1
                    await asyncio.sleep(random.uniform(1, 3))
            return None
        except:
            return None

async def main():
    if not os.path.exists(INPUT_DIR):
        print(f" ❌ 找不到矿区: {INPUT_DIR}")
        return

    # 加载已处理的文件 ID，实现断点续传
    processed_titles = set()
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    item = json.loads(line)
                    if "_file_id" in item:
                        processed_titles.add(item["_file_id"])
                except: pass

    files = [os.path.join(INPUT_DIR, f) for f in os.listdir(INPUT_DIR) if f.endswith(".md")]
    print(f"🚀 DeepSeek 炼油厂二次点火...")
    print(f"📊 待处理文件总数: {len(files)}")
    print(f"⏭️ 已跳过重复文件: {len(processed_titles)}")
    print("-" * 45)

    count_success = 0
    tasks = [refinery_task(f, processed_titles) for f in files]
    
    for i, task in enumerate(asyncio.as_completed(tasks)):
        res = await task
        if res == "ALREADY_DONE":
            continue
            
        if res:
            count_success += 1
            with open(OUTPUT_FILE, "a", encoding="utf-8") as out:
                out.write(json.dumps(res, ensure_ascii=False) + "\n")
            print(f" ✅ [{i+1}/{len(files)}] 提取成功：{res.get('source_title', 'Unknown')[:15]}...")
        else:
            print(f" ⏳ [{i+1}/{len(files)}] 无效信息，已跳过。")

    print(f"\n🎉 炼制阶段性圆满！本次新增黄金语料: {count_success} 条。")

if __name__ == "__main__":
    asyncio.run(main())