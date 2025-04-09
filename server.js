// server.js
import express from "express";
import { AIProjectsClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const app = express();
const PORT = 3005;

app.use(express.json());

const client = AIProjectsClient.fromConnectionString(
  "eastus.api.azureml.ms;a182fe30-ddfd-4f86-9bb2-9278c2f0c684;rg-nithin-9486_ai;nithin-8183",
  new DefaultAzureCredential()
);

const agentId = "asst_QX2vWprrYvkwJqUAX15rmmND";

app.post("/ask", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const thread = await client.agents.createThread();
    await client.agents.createMessage(thread.id, {
      role: "user",
      content: message
    });

    let run = await client.agents.createRun(thread.id, agentId);
    while (run.status === "queued" || run.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await client.agents.getRun(thread.id, run.id);
    }

    const messages = await client.agents.listMessages(thread.id);
    const assistantMessages = messages.data.filter((msg) => msg.role === "assistant");

    const reply = assistantMessages
      .map(msg =>
        msg.content
          .filter(item => item.type === "text")
          .map(item => item.text?.value)
          .join(" ")
      )
      .join("\n");

    res.json({ answer: reply || "No response from agent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get assistant response." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Legal Agent API running at http://localhost:${PORT}/ask`);
});
