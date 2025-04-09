
import readline from 'readline';
import { AIProjectsClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const client = AIProjectsClient.fromConnectionString(
  "westus.api.azureml.ms;a182fe30-ddfd-4f86-9bb2-9278c2f0c684;7thApr2025-Hub;reserachagents7thapr2025",
  new DefaultAzureCredential()
);

const agentId = "asst_4OzIi9DDiSIHcSWkTUZr1pbq";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Legal Assistant is ready. Type your message (or type 'exit' to quit):");

async function chat() {
  rl.question("You: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      rl.close();
      return;
    }

    try {
      const thread = await client.agents.createThread();
      await client.agents.createMessage(thread.id, {
        role: "user",
        content: input
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
          console.log(`\nLegal Assistant: ${response}\n`);
        } else {
          console.log("\nLegal Assistant: No response.\n");
        }
      } else {
        console.log(`\nLegal Assistant: Run ended with status: ${run.status}\n`);
      }
    } catch (err) {
      console.error("Error during chat: ", err);
    }

    // Loop again
    chat();
  });
}

chat();
