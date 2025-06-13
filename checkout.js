// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
    "HTTP-Referer": process.env.YOUR_SITE_URL, // Optional. Site URL for rankings on openrouter.ai.
    "X-Title": process.env.YOUR_SITE_NAME, // Optional. Site title for rankings on openrouter.ai.
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    "model": "deepseek/deepseek-r1-0528:free",
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  })
})
.then(response => response.json())
.then(data => {
  // Extract and display the AI's response
  if (data.choices && data.choices[0] && data.choices[0].message) {
    console.log("AI Response:", data.choices[0].message.content);
  } else {
    console.log("Full response:", data);
  }
})
.catch(error => {
  console.error('Error:', error);
});