import httpx
import asyncio
import os
import json
import re
import html2text
import random
from datetime import datetime
from urllib.parse import quote

# --- 配置区 ---
# 🚀 扩充后的关键词矩阵：为了“堆量”，建议覆盖更多细分搜索词
KEYWORDS_TASK = [
    "八字案例", 
    "奇门遁甲终身局", 
    "星盘分析",
    "命理实战",
    "紫微斗数解析",
    "六爻案例",
    "八字精解"
]

SAVE_DIR = "data/raw_zhihu" 
MAX_PAGES_PER_KEYWORD = 60   # 每个词抓取页数，增加到60页
LIMIT = 20                  # 每页结果数

# 🚀 必须填入最新的知乎 Cookie，否则搜索结果会被限制
ZHIHU_COOKIE = "_xsrf=hVlVaoVtAeRrjaiBU4vXCxjK6yR4Enua; _zap=c9e3045b-5eed-4d24-8b25-e4a4b2c262d5; d_c0=1aLUlH027xuPTmJEnBeQhIO7srmhNwsSbF8=|1772689770; Hm_lvt_98beee57fd2ef70ccdd5ca52b9740c49=1772689775; HMACCOUNT=CE48FD28C55DDA61; captcha_session_v2=2|1:0|10:1773212578|18:captcha_session_v2|88:bkhQelExMjk3WksvV0pUcFptdEYrRVhpdEdlQTIxMXp3ZGMwMm96Q2Y1OUVyajU1NHJQMktEZG0rSWVQM2xZVw==|b367eecbf8b1e4d30c2a2ebdac1bc22cc12d0e6d84d2024010cade984c9f8821; __snaker__id=IIDXuLMvIYYgNoee; gdxidpyhxdE=dJM1rA2jfZPr%2FXMBbl58uefR7DLZ8W%2Fspx1iAgCsXACyso0IVizdnDHorEdkxTxn2SwnAkkhy%2BJsLxtcNWodmhVs%2Fm2itClhqL8hSYZoNBh%2FxzS%2BeUy56l9bhZdkcDqDe9UOSiSo7SK8XHdwfjmsUvbfmNSDTCDrpE%5CKANuw%2BYcqLlfs%3A1773213482272; q_c1=30ed5da2e2cc47e18ead326315083242|1773212675000|1773212675000; z_c0=2|1:0|10:1773212676|4:z_c0|92:Mi4xVmZxVFF3QUFBQURWb3RTVWZUYnZHeVlBQUFCZ0FsVk5BbUtlYWdBOGxzNlN6TnhJdmtuaE03emNYcTNoWmZZMjd3|1e1d0e962d388fdc382c4fdb6d38158f489fd77c212a668d4f368827b7ea2052; __zse_ck=005_P1jDI0ebtWJoclLNtswF2ueg4E3g=WOzP6HPgh4IO6zj1e/LehPFLyKXoYL5KVKJBpRLrqyJkxI13kw5Kn=JDdbOTBZMn=I/dY1azcfS3XaDjRN8x359r3Yx1EkXAeFC-xf2sgGzYnlVBC+RdzPVoykY3H/tia1zQBfpgCtwaPIoM+FbIGbHSw/ucQAsfft2V1ET9CswZ5inG+Vo73ddGAd/gl59jHZ0LrwiwAzF9/1gJ0Zf1GwYs7QeAdWDxqgLw; SESSIONID=JfoY60HRZn2fR5EtXGQwJxNM0CqMc9cezgwowHq2W4C; JOID=VloRA0-3oA8jno1LRCORm1pHibpf-8Bkfqi7BRLtyDtByLgINte7vk6YjUlEoYTWrmV9lScZLmzqE4zU_isWjTo=; osd=U14SCkmypAwqmIhPRyqXnl5EgLxa_8NteK2_BhvrzT9Cwb4NMtSyuEucjkBCpIDVp2N4kSQQKGnuEIXS-y8VhDw=; BEC=d892da65acb7e34c89a3073e8fa2254f; Hm_lpvt_98beee57fd2ef70ccdd5ca52b9740c49=1773216498" 

class ZhihuMassCrawler:
    def __init__(self, keywords):
        self.keywords = keywords
        # 增加超时时间防止大文件下载中断
        self.client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
        self.h2t = html2text.HTML2Text()
        self.h2t.ignore_links = False
        
        if not os.path.exists(SAVE_DIR):
            os.makedirs(SAVE_DIR, exist_ok=True)

    def get_headers(self, keyword):
        encoded_kw = quote(keyword)
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": f"https://www.zhihu.com/search?type=content&q={encoded_kw}",
            "Cookie": ZHIHU_COOKIE,
            "x-requested-with": "fetch",
            "accept": "application/json, text/plain, */*",
        }

    async def search_items(self, keyword, offset=0):
        url = "https://www.zhihu.com/api/v4/search_v3"
        params = {
            "t": "general",
            "q": keyword,
            "offset": offset,
            "limit": LIMIT,
            "lc_idx": offset,
            "show_all_topics": "0",
            "search_source": "Normal"
        }
        try:
            headers = self.get_headers(keyword)
            resp = await self.client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 400:
                print(f" ❌ 【{keyword}】 400错误：通常是由于Cookie缺失或已过期。")
                return None
            else:
                print(f" ❌ 【{keyword}】 状态码: {resp.status_code}")
                return None
        except Exception as e:
            print(f" ❌ 【{keyword}】 异常: {e}")
            return None

    async def save_item(self, item, keyword_tag):
        obj = item.get("object", {})
        obj_type = obj.get("type")
        
        # 核心：支持回答(answer)和文章(article)
        if obj_type not in ["article", "answer"]:
            return

        # 提取标题：回答类型的标题通常在 question 字段中
        title = obj.get("title") or obj.get("question", {}).get("title") or "未命名案例"
        
        # 处理内容：回答可能没有直接的 content，有时在 excerpt
        content_html = obj.get("content") or obj.get("excerpt", "")
        if not content_html: return

        # 构造唯一标识防止重复（使用 ID）
        obj_id = obj.get("id")
        author = obj.get("author", {}).get("name", "匿名用户")
        timestamp = obj.get("updated") or obj.get("created_time") or 0
        created_time = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d')
        
        # 清洗文件名
        safe_title = re.sub(r'[\\/:*?"<>|]', '_', title)[:40].strip()
        file_name = f"[{obj_type.upper()}]{created_time}_{obj_id}_{safe_title}.md"
        file_path = os.path.join(SAVE_DIR, file_name)
        
        if os.path.exists(file_path):
            return

        try:
            markdown_content = self.h2t.handle(content_html)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(f"# {title}\n\n")
                f.write(f"来源标签: {keyword_tag} | 作者: {author} | 日期: {created_time}\n")
                f.write(f"链接: {obj.get('url', '')}\n\n---\n\n")
                f.write(markdown_content)
            print(f" ✅ 已采回 {obj_type}: {title[:20]}...")
        except:
            pass

    async def run(self):
        print(f"🚀 启动全量语料开采计划...")
        print(f"📊 关键词矩阵: {', '.join(self.keywords)}")
        print("-" * 50)
        
        total_saved = 0
        for kw in self.keywords:
            print(f"\n挖掘矿区: 【{kw}】")
            offset = 0
            
            for page in range(MAX_PAGES_PER_KEYWORD):
                data = await self.search_items(kw, offset)
                if not data or not data.get("data"):
                    print(f" ⏹️ 【{kw}】 已采空或遇到风控。")
                    break
                    
                items = data["data"]
                real_items = [it for it in items if "object" in it]
                
                tasks = [self.save_item(it, kw) for it in real_items]
                await asyncio.gather(*tasks)
                
                total_saved += len(real_items)
                if data.get("paging", {}).get("is_end"):
                    break
                    
                offset += LIMIT
                # 随机延时，给服务器喘息时间
                await asyncio.sleep(random.uniform(4, 8))
            
            print(f" ✨ 【{kw}】 挖掘阶段完成。")

        await self.client.aclose()
        print(f"\n🎉 矿区作业完毕！目前本地语料库已大幅扩充。")

if __name__ == "__main__":
    crawler = ZhihuMassCrawler(KEYWORDS_TASK)
    asyncio.run(crawler.run())