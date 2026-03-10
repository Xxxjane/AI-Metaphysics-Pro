import os
import requests
from bs4 import BeautifulSoup
import chromadb
from chromadb.utils import embedding_functions
import time
from urllib.parse import urljoin
import fitz  # 对应 pymupdf 库

# --- 配置区 ---
# 1. 网页抓取列表
ROOT_URLS = [
    "https://zh.wikisource.org/wiki/渊海子平",
    "https://zh.wikisource.org/wiki/滴天髓",
    "https://zh.wikisource.org/wiki/三命通会"
]

# 2. 本地 PDF 存放目录
PDF_VAULT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdf_vault")

def get_chapter_links(url):
    """提取目录页下的所有子章节链接"""
    links = [url]
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        res = requests.get(url, headers=headers, timeout=10)
        res.encoding = 'utf-8'
        soup = BeautifulSoup(res.text, 'html.parser')
        content_div = soup.find('div', class_='mw-parser-output')
        if content_div:
            for a in content_div.find_all('a', href=True):
                href = a['href']
                if href.startswith('/wiki/') and ':' not in href:
                    full_url = urljoin("https://zh.wikisource.org", href)
                    if full_url not in links:
                        links.append(full_url)
    except Exception as e:
        print(f"[Error] 提取链接失败: {e}")
    return links

def process_pdfs(collection):
    """解析 pdf_vault 文件夹中的所有 PDF 文件"""
    if not os.path.exists(PDF_VAULT):
        os.makedirs(PDF_VAULT)
        print(f"已创建目录: {PDF_VAULT}，请将 PDF 放入其中。")
        return

    print(f"\n--- 正在扫描本地 PDF 仓库: {PDF_VAULT} ---")
    files = [f for f in os.listdir(PDF_VAULT) if f.lower().endswith(".pdf")]
    
    if not files:
        print("未发现 PDF 文件，跳过此步。")
        return

    for file_name in files:
        file_path = os.path.join(PDF_VAULT, file_name)
        try:
            print(f"正在解析文档: {file_name}")
            doc = fitz.open(file_path)
            for page_num, page in enumerate(doc):
                text = page.get_text().strip()
                # 过滤掉字数太少的页面（如封面、广告）
                if len(text) > 100:
                    collection.add(
                        documents=[text],
                        ids=[f"pdf_{file_name}_p{page_num}"],
                        metadatas=[{"source": file_name, "type": "modern_text", "page": page_num}]
                    )
            print(f"  {file_name} 解析完成。")
        except Exception as e:
            print(f"  解析失败 {file_name}: {e}")

def build_database():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "metaphysics_db")
    
    client = chromadb.PersistentClient(path=db_path)
    emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="paraphrase-multilingual-MiniLM-L12-v2"
    )
    collection = client.get_or_create_collection(name="numerology_books", embedding_function=emb_fn)

    # 1. 处理网页数据 (古籍)
    processed_urls = set()
    for root_url in ROOT_URLS:
        print(f"\n--- 抓取古籍: {root_url} ---")
        chapters = get_chapter_links(root_url)
        for url in chapters:
            if url in processed_urls: continue
            try:
                res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15)
                res.encoding = 'utf-8'
                soup = BeautifulSoup(res.text, 'html.parser')
                content_blocks = [p.get_text().strip() for p in soup.find_all(['p', 'li']) if len(p.get_text()) > 40]
                if content_blocks:
                    collection.add(
                        documents=content_blocks,
                        ids=[f"web_{hash(url)}_{i}" for i in range(len(content_blocks))],
                        metadatas=[{"source": url, "type": "classic_book"} for _ in content_blocks]
                    )
                    print(f"  已存入 {url}")
                processed_urls.add(url)
                time.sleep(0.5)
            except: pass

    # 2. 处理本地 PDF 数据 (现代著作/论文)
    process_pdfs(collection)

    print("\n--- 命理知识库全量构建完成 ---")

if __name__ == "__main__":
    build_database()