// chatagent.js
import express from 'express';
import { AIProjectsClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

const client = AIProjectsClient.fromConnectionString(
  "westus.api.azureml.ms;a182fe30-ddfd-4f86-9bb2-9278c2f0c684;7thApr2025-Hub;reserachagents7thapr2025",
  new DefaultAzureCredential()
);

const agentId = "asst_4OzIi9DDiSIHcSWkTUZr1pbq";

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const thread = await client.agents.createThread();
    await client.agents.createMessage(thread.id, {
      role: "user",
      content: message
    });

    let run = await client.agents.createRun(thread.id, agentId);

    // Polling until run completes
    while (run.status === "queued" || run.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await client.agents.getRun(thread.id, run.id);
    }

    if (run.status === "completed") {
      const messages = await client.agents.listMessages(thread.id);
      const assistantMessages = messages.data.filter(msg => msg.role === "assistant");

      let response = null;
      for (const msg of assistantMessages) {
        for (const item of msg.content) {
          if (item.type === "text" && item.text?.value) {
            response = item.text.value;
          }
        }
      }

      if (response) {
        res.json({ response });
      } else {
        res.status(500).json({ error: "No response from assistant" });
      }
    } else {
      res.status(500).json({ error: `Run ended with status: ${run.status}` });
    }
  } catch (err) {
    console.error("Error during chat: ", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Legal Assistant server running at http://localhost:${port}`);
});