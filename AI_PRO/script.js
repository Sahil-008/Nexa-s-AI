const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const historyPanel = document.querySelector(".history-panel");
const historyList = document.querySelector(".history-list");
const historyToggleBtn = document.querySelector("#history-toggle-btn");
const closeHistoryBtn = document.querySelector("#close-history-btn");
const clearHistoryBtn = document.querySelector("#clear-history-btn");
const suggestionItems = document.querySelectorAll(".suggestions-item");

// API 
const API_KEY = "AIzaSyDxXBNpOPbnlzwCSVEsLFe98T79GU-CcUg";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };

// System Instruction
const systemInstruction = `You are an AI Personal Life Coach. Your mission is to empower users with daily motivation, self-improvement strategies, goal-setting techniques, and mental well-being support.

Your Responsibilities:
Provide Actionable Guidance: Offer step-by-step self-improvement techniques, practical exercises, and habit-forming strategies.

Share Motivational Content: Deliver inspiring stories, quotes, and life lessons that encourage personal growth.

Assist with Goal-Setting: Help users define clear, achievable goals with structured roadmaps and progress-tracking tips.

Support Mental Well-Being: Share stress management techniques, mindfulness practices, and emotional resilience strategies.

Encourage Self-Reflection: Offer thought-provoking questions and journaling prompts to promote self-awareness.

Response Guidelines:
Be Detailed & Structured: Provide responses in a well-organized manner using bullet points, numbered lists, or step-by-step breakdowns.

Give Practical Examples: Offer real-world applications and scenarios to help users implement the advice effectively.

Ensure Depth & Clarity: Avoid overly brief responses—expand on key concepts and provide deeper insights.

Promote Positivity & Growth: Frame responses in an encouraging, optimistic, and solution-oriented tone.

Restrictions:
Do Not Provide Factual Data or News: Avoid answering queries related to current events, statistics, or technical topics.

Avoid Personal, Medical, or Financial Advice: Politely steer users away from these topics and refocus on personal development.

Redirect Off-Topic Requests: If a user asks something outside your scope, gently guide them back to self-improvement topics.`;

// Function to create message elements
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Modern scrolling behavior for chat interface
const smoothScrollToBottom = (force = false) => {
  const scrollHeight = container.scrollHeight;
  const currentScroll = container.scrollTop;
  const targetScroll = scrollHeight - container.clientHeight;
  const isNearBottom = (targetScroll - currentScroll) < 300; // Increased threshold

  // Only auto-scroll if forced or if user was already near bottom
  if (!force && !isNearBottom) return;

  // If user is manually scrolling up, don't auto-scroll
  if (container.scrollTop < currentScroll && !force) return;

  // Use native smooth scrolling
  container.scrollTo({
    top: targetScroll,
    behavior: 'smooth'
  });
};

// Update scrollToBottom function to be more conservative
const scrollToBottom = (force = false) => {
  if (!force) {
    // Only scroll if user is near bottom
    const scrollHeight = container.scrollHeight;
    const currentScroll = container.scrollTop;
    const targetScroll = scrollHeight - container.clientHeight;
    const isNearBottom = (targetScroll - currentScroll) < 300;
    
    if (!isNearBottom) return;
  }
  
  smoothScrollToBottom(force);
};

// Add scroll event listener to track user scrolling
let isUserScrolling = false;
let scrollTimeout;
let lastScrollTop = 0;

container.addEventListener('scroll', () => {
  const currentScroll = container.scrollTop;
  
  // Detect if user is scrolling up
  if (currentScroll < lastScrollTop) {
    isUserScrolling = true;
  }
  
  lastScrollTop = currentScroll;
  
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    isUserScrolling = false;
  }, 1000); // Increased timeout to 1 second
});

// Function to save chat to history
const saveChatToHistory = (userMessage, botResponse) => {
  const timestamp = new Date().toLocaleString();
  const historyItem = document.createElement("div");
  historyItem.classList.add("history-item");
  historyItem.innerHTML = `
    <p class="preview">${userMessage}</p>
    <p class="bot-preview">${botResponse.substring(0, 60)}...</p>
    <span class="timestamp">${timestamp}</span>
    <button class="delete-btn material-symbols-rounded">delete</button>
  `;
  
  // Store the full conversation for reloading
  historyItem.dataset.userMessage = userMessage;
  historyItem.dataset.botResponse = botResponse;
  
  // Add delete functionality for individual history item
  const deleteBtn = historyItem.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    historyItem.remove();
    saveHistoryToLocalStorage();
  });
  
  // Add click functionality to load the chat
  historyItem.addEventListener("click", () => {
    loadChatFromHistory(userMessage);
    historyPanel.classList.remove("active");
  });
  
  historyList.insertBefore(historyItem, clearHistoryBtn.nextSibling);
  saveHistoryToLocalStorage();
};

// Function to save history to local storage
const saveHistoryToLocalStorage = () => {
  const historyItems = Array.from(historyList.querySelectorAll(".history-item")).map(item => ({
    userMessage: item.dataset.userMessage,
    botResponse: item.dataset.botResponse,
    timestamp: item.querySelector(".timestamp").textContent
  }));
  localStorage.setItem("chatHistory", JSON.stringify(historyItems));
};

// Function to load history from local storage
const loadHistoryFromLocalStorage = () => {
  const savedHistory = localStorage.getItem("chatHistory");
  if (savedHistory) {
    const historyItems = JSON.parse(savedHistory);
    historyItems.forEach(item => {
      const historyItem = document.createElement("div");
      historyItem.classList.add("history-item");
      historyItem.dataset.userMessage = item.userMessage;
      historyItem.dataset.botResponse = item.botResponse;
      historyItem.innerHTML = `
        <p class="preview">${item.userMessage}</p>
        <p class="bot-preview">${item.botResponse.substring(0, 60)}...</p>
        <span class="timestamp">${item.timestamp}</span>
        <button class="delete-btn material-symbols-rounded">delete</button>
      `;
      
      // Add delete functionality
      const deleteBtn = historyItem.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        historyItem.remove();
        saveHistoryToLocalStorage();
      });
      
      // Add click functionality to load the chat
      historyItem.addEventListener("click", () => {
        loadChatFromHistory(item.userMessage);
        historyPanel.classList.remove("active");
      });
      
      historyList.insertBefore(historyItem, clearHistoryBtn.nextSibling);
    });
  }
};

// Function to load chat from history
const loadChatFromHistory = (userMessage) => {
  promptInput.value = userMessage;
  handleFormSubmit(new Event("submit"));
};

// Modify typingEffect to respect user scrolling
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;

  // Set an interval to type each word
  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      // Only scroll if user is not actively scrolling up
      if (!isUserScrolling) {
        scrollToBottom(false);
      }
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
      // Only scroll to bottom if user is not actively scrolling up
      if (!isUserScrolling) {
        scrollToBottom(true);
      }
    }
  }, 40);
};

// Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    parts: [
      { text: `${systemInstruction}\n\nUser: ${userData.message}` },
      ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])
    ],
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    
    // Save to chat history after getting the response
    saveChatToHistory(userData.message, responseText);
    
    typingEffect(responseText, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
    
  } catch (error) {
    textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : "Server busy. Please try again later.";
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

// Update handleFormSubmit to handle both manual input and suggestions
const handleFormSubmit = (e) => {
  e.preventDefault();
  // Get message from input or use existing value (for suggestions)
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  // Hide suggestions after a suggestion is clicked
  document.body.classList.add("chats-active");
  
  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  // Generate user message HTML with optional file attachment
  const userMsgHTML = `<p class="message-text"></p>`;
  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom(true);

  setTimeout(() => {
    // Generate bot message HTML and add in the chat container
    const botMsgHTML = `<img class="avatar" src="logo1.png" /> <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom(false);
    generateResponse(botMsgDiv);
  }, 600);
};

// Handle file input change (file upload)
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    // Store file data in userData obj
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
  };
});

// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});

// Stop Bot Response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
});

// Toggle history panel
historyToggleBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // Prevent the document click handler from immediately closing the panel
  historyPanel.classList.toggle("active");
});

// Close history panel
closeHistoryBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // Prevent event bubbling
  historyPanel.classList.remove("active");
});

// Clear all history
clearHistoryBtn.addEventListener("click", () => {
  const historyItems = historyList.querySelectorAll(".history-item");
  historyItems.forEach(item => item.remove());
  localStorage.removeItem("chatHistory");
});

// Handle form submission
promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

// Add click event handler for suggestions
suggestionItems.forEach(item => {
  item.addEventListener("click", () => {
    const questionText = item.querySelector(".text").textContent;
    promptInput.value = questionText;
    handleFormSubmit(new Event("submit"));
  });
});

// Modify the click event listener for the history panel
document.addEventListener("click", (e) => {
  // Check if click is outside the history panel
  if (!historyPanel.contains(e.target) && !historyToggleBtn.contains(e.target)) {
    historyPanel.classList.remove("active");
  }
});

// Prevent clicks inside the history panel from closing it
historyPanel.addEventListener("click", (e) => {
  e.stopPropagation(); 
