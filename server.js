require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios")

const app = express();
app.use(cors());
app.use(express.json());

const products = [
    { id: 1, name: "Apple iPhone 15 Pro", category: "smartphones", price: 999, description: "Latest iPhone with titanium design and A17 Pro chip", brand: "Apple", tags: ["flagship", "camera", "premium"] },
    { id: 2, name: "Samsung Galaxy S24 Ultra", category: "smartphones", price: 1299, description: "Android flagship with built-in S Pen and 200MP camera", brand: "Samsung", tags: ["android", "stylus", "camera"] },
    { id: 3, name: "Sony WH-1000XM5", category: "headphones", price: 349, description: "Industry-leading noise canceling wireless headphones", brand: "Sony", tags: ["noise-canceling", "wireless", "premium"] },
    { id: 4, name: "Apple MacBook Air M2", category: "laptops", price: 1099, description: "Thin and light laptop with M2 chip, fanless design", brand: "Apple", tags: ["mac", "thin", "battery"] },
    { id: 5, name: "Dell XPS 15", category: "laptops", price: 1299, description: "Windows laptop with OLED display and powerful performance", brand: "Dell", tags: ["windows", "oled", "performance"] },
    { id: 6, name: "iPad Pro 12.9", category: "tablets", price: 1099, description: "Professional tablet with M2 chip and Liquid Retina XDR display", brand: "Apple", tags: ["tablet", "creative", "stylus"] },
    { id: 7, name: "Bose QuietComfort 45", category: "headphones", price: 279, description: "Comfortable noise canceling headphones for all-day wear", brand: "Bose", tags: ["noise-canceling", "comfort", "wireless"] },
    { id: 8, name: "Samsung 65\" QLED TV", category: "tv", price: 799, description: "4K QLED Smart TV with quantum dot technology", brand: "Samsung", tags: ["4k", "smart-tv", "large"] },
    { id: 9, name: "Google Pixel 8", category: "smartphones", price: 699, description: "Google's flagship with best-in-class AI camera features", brand: "Google", tags: ["android", "ai", "camera"] },
    { id: 10, name: "Nintendo Switch OLED", category: "gaming", price: 349, description: "Hybrid gaming console with vibrant OLED screen", brand: "Nintendo", tags: ["gaming", "portable", "family"] },
    { id: 11, name: "LG C3 OLED 55\"", category: "tv", price: 1299, description: "Perfect OLED TV for gaming and movies with 120Hz", brand: "LG", tags: ["oled", "gaming", "4k"] },
    { id: 12, name: "Anker PowerCore 26800", category: "accessories", price: 69, description: "High-capacity portable charger for all devices", brand: "Anker", tags: ["portable", "charging", "budget"] },
    { id: 13, name: "Logitech MX Master 3S", category: "accessories", price: 99, description: "Premium wireless mouse for productivity", brand: "Logitech", tags: ["mouse", "productivity", "wireless"] },
    { id: 14, name: "Sony PlayStation 5", category: "gaming", price: 499, description: "Next-gen gaming console with ultra-high speed SSD", brand: "Sony", tags: ["gaming", "4k", "console"] },
    { id: 15, name: "Kindle Paperwhite", category: "ereader", price: 139, description: "Waterproof e-reader with 6.8\" display and adjustable warm light", brand: "Amazon", tags: ["reading", "portable", "budget"] }
];

app.get("/app/products", async (req, res) => {
    try {
        let result = [...products];
        const { category, maxPrice, search } = req.query;
        if (category) {
            result = result.filter((cat) => cat.category === category);
        }
        if (maxPrice) {
            result = result.filter((pr) => pr.price < Number(maxPrice));
        }
        if (search) {
            result = result.filter((item) =>
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.description.toLowerCase().includes(search.toLowerCase())
            )
        }

        return res.status(200).json({ products: result, totalProducts: result.length })
    } catch (error) {
        res.status(500).json({ msg: "Server could not process the request", err: error.message })
    }
})

app.get("/app/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const product = products.find((item) => item.id == Number(id));
        res.status(200).json({ product: product });
    } catch (error) {
        res.status(500).json({ msg: "Server is not able to process this request", error: error.message })
    }
})

function seachProducts(query) {
    const q = query.toLowerCase();
    return products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q))
    )
}

app.post("/app/chat", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });

        const words = message.toLowerCase().split(/\s+/);
        let contextProducts = [];
        for (const word of words) {
            if (word.length > 2) {
                const found = seachProducts(word);
                contextProducts.push(...found);
            }
        }

        contextProducts = [...new Map(contextProducts.map(p => [p.id, p])).values()].slice(0, 5);

        const productContext = contextProducts.length > 0
            ? `Relevant products from our catalog:\n${contextProducts.map(p =>
                `- ${p.name} (₹${p.price}): ${p.description}`
            ).join('\n')}`
            : `We have ${products.length} products: smartphones, laptops, tablets, headphones, TV, gaming, accessories. Price: ₹69-₹1299.`;

        const systemPrompt = `You are a helpful product assistant. Be concise (2-3 sentences).\n${productContext}`;

        const apiKey = process.env.GROQ_API_KEY;

        const groqRes = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                max_tokens: 200,
                temperature: 0.7
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const reply = groqRes.data.choices[0].message.content;
        res.json({ reply, products: contextProducts.slice(0, 4) });

    } catch (error) {
        console.log(error.response?.data || error.message);
        res.status(500).json({ msg: "Server error", error: error.message });
    }
});


const port = 5000;

app.listen(port, () => {
    console.log(`Server is running at port ${port}`);
})