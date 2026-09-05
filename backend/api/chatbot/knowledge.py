import re


INTENT_GREETING = "greeting"
INTENT_OUT_OF_SCOPE = "out_of_scope"
INTENT_GENERAL_SHOPPING = "shopping_help"


CAPABILITY_DOCUMENTS = [
    {
        "id": "product_recommendation",
        "title": "Product recommendation",
        "keywords": [
            "recommend",
            "suggest",
            "find",
            "show",
            "product",
            "artwork",
            "painting",
            "sculpture",
            "style",
            "minimalist",
            "modern",
            "nordic",
            "traditional",
            "推荐",
            "介绍",
            "找",
            "产品",
            "作品",
            "画",
            "畫",
            "雕塑",
            "风格",
            "風格",
            "现代",
            "現代",
            "简约",
            "簡約",
            "现代简约",
            "現代簡約",
            "北欧",
            "北歐",
            "传统",
            "傳統",
            "装饰",
            "裝飾",
        ],
        "content": (
            "The assistant can recommend and list DeltricArt products from the provided "
            "product context. It must explain why a product fits the user's preference, "
            "scenario, budget, or style."
        ),
    },
    {
        "id": "product_comparison",
        "title": "Product comparison",
        "keywords": ["compare", "comparison", "versus", "vs", "better", "比较", "對比", "哪个好", "哪一个"],
        "content": (
            "The assistant can compare products only when the products are present in "
            "the product context. Comparison should focus on price, category, stock, "
            "dimensions, description, scenario fit, and suitability."
        ),
    },
    {
        "id": "budget_filtering",
        "title": "Budget filtering",
        "keywords": ["budget", "under", "below", "less", "cheap", "affordable", "rm", "myr", "预算", "預算", "以下", "以内", "以內"],
        "content": (
            "The assistant can help users filter products by budget. It must not invent "
            "discounts or prices. Use only the product prices in product context."
        ),
    },
    {
        "id": "scenario_recommendation",
        "title": "Scenario recommendation",
        "keywords": [
            "gift",
            "living room",
            "office",
            "decor",
            "collection",
            "birthday",
            "housewarming",
            "送礼",
            "礼物",
            "客厅",
            "客廳",
            "办公室",
            "辦公室",
            "收藏",
            "新家",
            "生日",
        ],
        "content": (
            "The assistant can recommend products by use case or scenario, such as "
            "living room decor, office display, gifts, collection, birthday, or housewarming."
        ),
    },
    {
        "id": "purchase_history",
        "title": "Purchase-history personalization",
        "keywords": ["history", "past purchase", "bought", "previous", "personalized", "购买记录", "購買記錄", "买过", "買過", "个性化", "個性化"],
        "content": (
            "For logged-in users, the assistant can use purchase history from context "
            "to suggest similar or complementary DeltricArt products."
        ),
    },
    {
        "id": "product_qa",
        "title": "Product Q&A",
        "keywords": ["stock", "available", "price", "category", "description", "dimension", "size", "width", "height", "length", "suitable", "库存", "價格", "价格", "尺寸", "宽", "寬", "高", "长", "長", "适合", "適合", "分类", "分類"],
        "content": (
            "The assistant can answer product questions only from product context, "
            "including stock, price, category, code, dimensions, and description."
        ),
    },
    {
        "id": "shopping_help",
        "title": "Shopping assistance",
        "keywords": ["cart", "checkout", "payment", "delivery", "pickup", "order", "购物车", "结账", "付款", "配送", "自取", "订单"],
        "content": (
            "The assistant can provide basic shopping guidance for DeltricArt browsing, "
            "cart, checkout, payment, pickup, delivery, and orders when the answer is "
            "supported by provided context. It must not invent policies."
        ),
    },
    {
        "id": "multi_language",
        "title": "Multi-language support",
        "keywords": ["中文", "english", "malay", "bahasa", "translate", "翻译", "翻譯"],
        "content": (
            "The assistant can reply in the same language as the user for DeltricArt "
            "shopping-related questions."
        ),
    },
]

STRICTLY_OUT_OF_SCOPE_KEYWORDS = [
    "medical",
    "medicine",
    "diagnosis",
    "legal",
    "lawsuit",
    "investment",
    "stock market",
    "crypto",
    "coding",
    "programming",
    "homework",
    "weather",
    "politics",
    "recipe",
    "doctor",
    "lawyer",
    "代码",
    "程式",
    "编程",
    "醫療",
    "医疗",
    "法律",
    "投资",
    "投資",
    "股票",
    "天气",
    "天氣",
    "政治",
    "食谱",
    "食譜",
]

GREETING_OR_IDENTITY_KEYWORDS = [
    "hi",
    "hello",
    "hey",
    "who are you",
    "what can you do",
    "你好",
    "嗨",
    "你是谁",
    "你是誰",
    "你可以做什么",
    "你可以做什麼",
]


def retrieve_capability_context(message, limit=4):
    lowered = str(message or "").lower()
    scored_documents = []
    for document in CAPABILITY_DOCUMENTS:
        score = sum(1 for keyword in document["keywords"] if keyword.lower() in lowered)
        if score:
            scored_documents.append((score, document))

    scored_documents.sort(key=lambda item: item[0], reverse=True)
    return [document for _, document in scored_documents[:limit]]


def is_greeting_or_identity_request(message):
    lowered = str(message or "").lower().strip()
    exact_greetings = {"hi", "hello", "hey", "你好", "嗨"}
    if lowered in exact_greetings:
        return True
    return any(
        keyword in lowered
        for keyword in GREETING_OR_IDENTITY_KEYWORDS
        if len(keyword.split()) > 1 or re.search(r"[\u4e00-\u9fff]", keyword)
    )


def classify_chatbot_intent(message, capability_documents):
    lowered = str(message or "").lower().strip()
    if not lowered:
        return INTENT_OUT_OF_SCOPE
    if any(keyword in lowered for keyword in STRICTLY_OUT_OF_SCOPE_KEYWORDS):
        return INTENT_OUT_OF_SCOPE
    if is_greeting_or_identity_request(message):
        return INTENT_GREETING
    if capability_documents:
        return capability_documents[0]["id"]
    if re.search(r"\b(art|artist|gallery|wall|decor|gift|price|buy|order)\b", lowered):
        return INTENT_GENERAL_SHOPPING
    return INTENT_OUT_OF_SCOPE


def is_supported_request(message, capability_documents):
    return classify_chatbot_intent(message, capability_documents) != INTENT_OUT_OF_SCOPE


def build_capability_context(capability_documents):
    return "\n".join(
        f"- {document['title']}: {document['content']}" for document in capability_documents
    )


def build_out_of_scope_reply(message):
    if re.search(r"[\u4e00-\u9fff]", str(message or "")):
        return (
            "抱歉，这个问题不在 DeltricArt AI 购物助手的能力范围内。我可以帮你找产品、"
            "比较产品、根据预算或场景推荐作品、回答产品问题，或根据你的购买记录做推荐。"
        )
    return (
        "Sorry, that is outside the scope of DeltricArt's AI shopping assistant. "
        "I can help with product search, product comparison, budget or scenario recommendations, "
        "product Q&A, and personalized shopping suggestions."
    )


def build_greeting_reply(message):
    if re.search(r"[\u4e00-\u9fff]", str(message or "")):
        return (
            "你好，我是 DeltricArt AI 购物助手。你可以问我产品推荐、产品比较、"
            "预算筛选、适合场景，或关于作品的问题。"
        )
    return (
        "Hello, I am DeltricArt's AI shopping assistant. I can help with product "
        "recommendations, product comparison, budget filtering, scenario suggestions, "
        "and product questions."
    )
