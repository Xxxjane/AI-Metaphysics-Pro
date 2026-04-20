import os
import json
import time
import logging
import chromadb
from chromadb.utils import embedding_functions

# --- 0. 环境与日志配置 ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("XuanTu.Importer")

# --- 1. 路径配置 (确保绝对路径在各种执行环境下都生效) ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BASE_DIR, "metaphysics_db")
JSONL_FILE = os.path.join(BASE_DIR, "data", "cleaned_cases.jsonl")

# 向量模型配置
# 🎯 升级为 BAAI/bge-m3，解决玄学专业词汇向量距离过远的问题
# 初次运行会自动下载权重 (约1.1GB)，请确保网络连接
VECTOR_MODEL = "BAAI/bge-m3"
COLLECTION_NAME = "master_insights_v2"

def import_master_data():
    """
    执行【工业级抗稀释】数据注入：
    - 表 (Documents): 仅存放高浓度命理标签（用于精准搜索）
    - 里 (Metadatas): 存放 full_payload（用于喂给 LLM 的完整背景故事）
    """
    
    # 1. 前置检查
    if not os.path.exists(JSONL_FILE):
        logger.error(f"❌ 原始语料文件缺失: {JSONL_FILE}")
        return

    # 2. 初始化数据库与模型
    logger.info(f"⏳ 正在初始化 ChromaDB 持久化引擎: {DB_PATH}")
    db_client = chromadb.PersistentClient(path=DB_PATH)
    
    logger.info(f"⏳ 正在加载向量模型 [{VECTOR_MODEL}] ...")
    start_time = time.time()
    try:
        emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=VECTOR_MODEL
        )
    except Exception as e:
        logger.error(f"❌ 模型加载失败: {e}")
        return

    # 3. 清洗旧集合 (由于 Embedding 模型从 MiniLM 换到了 BGE-M3，维度不同，必须重建)
    try:
        db_client.delete_collection(name=COLLECTION_NAME)
        logger.info(f"🗑️ 已清理旧版集合 [{COLLECTION_NAME}]")
    except:
        pass
    
    collection = db_client.create_collection(
        name=COLLECTION_NAME, 
        embedding_function=emb_fn,
        metadata={"hnsw:space": "cosine"} # 使用余弦相似度
    )

    # 4. 读取并处理数据
    logger.info(f"🚀 开始处理语料库数据...")
    
    documents = []  # 浓缩索引
    metadatas = []  # 完整载荷
    ids = []
    
    success_count = 0
    fail_count = 0

    with open(JSONL_FILE, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            try:
                data = json.loads(line)
                title = data.get("source_title", "未命名案例")
                context = data.get("case_context", "")
                insights = data.get("insights", "")
                
                if not insights: continue

                # 【表】高浓度检索索引：去掉“女教师、大学毕业”等噪音，只留命理骨架
                # 这样向量模型在计算距离时会非常精准
                dense_index = f"命理格局主题: {title}。核心推演心法: {insights[:200]}"
                
                # 【里】完整载荷：将你认为“关键变量”的繁琐背景存入 Metadata
                # 后端会直接读取此字段喂给大模型
                full_payload = (
                    f"【原始案例标题】: {title}\n"
                    f"【现实背景变量】: {context}\n"
                    f"【大师实战心法】: {insights}"
                )
                
                documents.append(dense_index) 
                metadatas.append({
                    "source": title,
                    "type": "master_experience",
                    "full_payload": full_payload 
                })
                ids.append(f"bge_pro_{i}")
                success_count += 1
                
            except Exception as e:
                fail_count += 1
                logger.warning(f"⚠️ 第 {i} 行解析跳过: {e}")

    # 5. 分批执行原子写入 (防止内存溢出或数据库单次写入限制)
    batch_size = 50 # BGE-M3 维度较高，batch 不宜过大
    total = len(documents)
    
    logger.info(f"📦 准备执行分批写入，总计有效数据: {total} 条")
    
    for i in range(0, total, batch_size):
        end = i + batch_size
        try:
            collection.add(
                ids=ids[i:end],
                documents=documents[i:end],
                metadatas=metadatas[i:end]
            )
            logger.info(f" ✅ 写入进度: {min(end, total)} / {total}")
        except Exception as e:
            logger.error(f"❌ 批量写入失败 [Range {i}-{end}]: {e}")

    # 6. 完工报告
    end_time = time.time()
    duration = end_time - start_time
    logger.info("-" * 50)
    logger.info(f"🎉 任务圆满完成！")
    logger.info(f"⏱️ 总耗时: {duration:.2f} 秒")
    logger.info(f"📈 成功导入: {success_count} 条")
    logger.info(f"📉 失败/跳过: {fail_count} 条")
    logger.info(f"💡 提示: 知识库已由 BGE-M3 模型重新索引，请务必同步更新后端代码！")
    logger.info("-" * 50)

if __name__ == "__main__":
    import_master_data()