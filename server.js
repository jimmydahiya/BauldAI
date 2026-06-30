import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb"}));
app.use(express.urlencoded({ limit: "50mb", extended: true}));
app.use(express.static("public"));

const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1"
});

app.post("/chat", async (req, res) => {

    try{

        const {messages} = req.body;

        const completion = await client.chat.completions.create({

            model:"google/gemma-4-26b-a4b-it:free",

            messages:messages

        });

        res.json({

            reply:completion.choices[0].message.content

        });

    }

   catch(error){

    console.error(error);

    if (
        error.status === 429 &&
        error.error?.message?.includes("free-models-per-day")
    ) {

        return res.status(429).json({

            reply: "🚫 Today's free AI limit has been reached.\n\nPlease come back tomorrow when the free quota resets."

        });

    }

    res.status(500).json({

        reply: "⚠️ Something went wrong. Please try again."

    });

}

});
app.post("/writer", async (req, res) => {

    try {

        const { prompt } = req.body;

        const completion = await client.chat.completions.create({

            model: "google/gemma-4-26b-a4b-it:free",

            messages: [

                {
                    role: "system",
                    content: "You are an expert writing assistant. Produce only the requested text output without preamble, meta-commentary, or extra explanation."
                },

                {
                    role: "user",
                    content: prompt
                }

            ]

        });

        res.json({
            reply: completion.choices[0].message.content
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            reply: "Something went wrong."
        });

    }

});
app.post("/image", async (req, res) => {

    try {

        const { image, prompt } = req.body;

        const completion = await client.chat.completions.create({

            model: "google/gemma-4-26b-a4b-it:free",

            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: image
                            }
                        }
                    ]
                }
            ]

        });

        res.json({
            reply: completion.choices[0].message.content
        });

    } catch (error) {

    console.error("========== IMAGE ERROR ==========");
    console.error(error);

    if (error.response) {
        console.error(error.response.data);
    }

    res.status(500).json({
        reply: error.message
    });

}

});

const PORT=3000;

app.listen(PORT,()=>{

    console.log(`Server running on http://localhost:${PORT}`);

});