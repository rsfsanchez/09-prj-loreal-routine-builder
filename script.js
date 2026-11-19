/* =====================================================
   L'OREAL ROUTINE BUILDER - PROJECT 9
   ===================================================== */

// Cloudflare Worker from Project 8.
// No API key is stored in this file.
const WORKER_URL = "https://loreal-beauty-advisor.rsanch92.workers.dev/";

/* DOM ELEMENTS */

const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const resultCount = document.getElementById("resultCount");

const selectedProductsList = document.getElementById("selectedProductsList");
const selectedCount = document.getElementById("selectedCount");
const clearSelections = document.getElementById("clearSelections");
const generateRoutine = document.getElementById("generateRoutine");

const productDialog = document.getElementById("productDialog");
const dialogContent = document.getElementById("productDialogContent");
const closeDialog = document.getElementById("closeProductDialog");

const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const rtlToggle = document.getElementById("rtlToggle");

// Update footer year
document.getElementById("currentYear").textContent = new Date().getFullYear();

/* APPLICATION STATE */

let products = [];
let messages = [];
let isSending = false;
let selectedIds = [];

// Restore selected products from localStorage
try {
  selectedIds = JSON.parse(
    localStorage.getItem("lorealSelectedProducts") || "[]",
  );

  if (!Array.isArray(selectedIds)) {
    selectedIds = [];
  }
} catch {
  selectedIds = [];
}

/* HELPER FUNCTION */

// Create HTML elements safely
function makeElement(tag, className = "", text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

/* =====================================================
   LOAD PRODUCTS
   ===================================================== */

async function loadProducts() {
  try {
    const response = await fetch("products.json");

    if (!response.ok) {
      throw new Error("Could not load products.");
    }

    const data = await response.json();

    products = data.products;

    if (!Array.isArray(products)) {
      throw new Error("Invalid product data.");
    }

    // Remove saved IDs that no longer exist
    selectedIds = selectedIds.filter((id) =>
      products.some((product) => String(product.id) === String(id)),
    );

    saveSelections();

    // Create category options automatically
    const categories = [
      ...new Set(products.map((product) => product.category)),
    ].sort();

    // Keep the existing All Categories option
    categoryFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All Categories";
    categoryFilter.appendChild(allOption);

    categories.forEach((category) => {
      const option = document.createElement("option");

      option.value = category;
      option.textContent = category.charAt(0).toUpperCase() + category.slice(1);

      categoryFilter.appendChild(option);
    });

    displayProducts();
    displaySelectedProducts();
  } catch (error) {
    productsContainer.textContent =
      "Unable to load products. Please use a local server.";

    resultCount.textContent = "0 products";

    console.error("Product loading error:", error);
  }
}

/* =====================================================
   PRODUCT SEARCH AND CATEGORY FILTER
   ===================================================== */

function displayProducts() {
  const search = productSearch.value.toLowerCase().trim();
  const category = categoryFilter.value;

  const filtered = products.filter((product) => {
    const matchesCategory = !category || product.category === category;

    const searchableText = `
      ${product.name}
      ${product.brand}
      ${product.category}
      ${product.description || ""}
    `.toLowerCase();

    return matchesCategory && searchableText.includes(search);
  });

  productsContainer.innerHTML = "";

  resultCount.textContent = `${filtered.length} products`;

  if (filtered.length === 0) {
    productsContainer.appendChild(
      makeElement("p", "placeholder-message", "No matching products found."),
    );

    return;
  }

  filtered.forEach((product) => {
    const isSelected = selectedIds.includes(product.id);

    // Create product card
    const card = makeElement(
      "div",
      `product-card ${isSelected ? "selected" : ""}`,
    );

    // Product image
    const image = makeElement("img", "product-image");

    image.src = product.image;
    image.alt = product.name;
    image.loading = "lazy";

    // Product information
    const info = makeElement("div", "product-info");

    info.appendChild(makeElement("p", "product-brand", product.brand));

    info.appendChild(makeElement("h3", "product-name", product.name));

    info.appendChild(makeElement("p", "product-category", product.category));

    // Product buttons
    const actions = makeElement("div", "product-actions");

    const selectButton = makeElement(
      "button",
      "product-select-btn",
      isSelected ? "Remove" : "Select Product",
    );

    selectButton.type = "button";

    selectButton.setAttribute("aria-pressed", String(isSelected));

    selectButton.addEventListener("click", () => {
      toggleProduct(product.id);
    });

    const detailsButton = makeElement("button", "details-btn", "Details");

    detailsButton.type = "button";

    detailsButton.addEventListener("click", () => {
      showProductDetails(product);
    });

    actions.append(selectButton, detailsButton);

    info.appendChild(actions);

    card.append(image, info);

    // Allow selecting by clicking the card
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;

      toggleProduct(product.id);
    });

    productsContainer.appendChild(card);
  });
}

/* =====================================================
   PRODUCT SELECTION
   ===================================================== */

function toggleProduct(id) {
  if (isSending) return;

  if (selectedIds.includes(id)) {
    selectedIds = selectedIds.filter((item) => item !== id);
  } else {
    selectedIds.push(id);
  }

  saveSelections();
  displayProducts();
  displaySelectedProducts();
}

/* SAVE SELECTED PRODUCTS */

function saveSelections() {
  localStorage.setItem("lorealSelectedProducts", JSON.stringify(selectedIds));
}

/* GET SELECTED PRODUCTS */

function getSelectedProducts() {
  return products.filter((product) => selectedIds.includes(product.id));
}

/* =====================================================
   DISPLAY SELECTED PRODUCTS
   ===================================================== */

function displaySelectedProducts() {
  selectedProductsList.innerHTML = "";

  const selected = getSelectedProducts();

  selectedCount.textContent = `${selected.length} products selected`;

  generateRoutine.disabled = selected.length === 0 || isSending;

  clearSelections.disabled = selected.length === 0 || isSending;

  if (selected.length === 0) {
    selectedProductsList.appendChild(
      makeElement(
        "p",
        "empty-selection",
        "You haven't selected any products yet.",
      ),
    );

    return;
  }

  selected.forEach((product) => {
    const chip = makeElement("div", "selected-chip");

    const image = makeElement("img");

    image.src = product.image;
    image.alt = "";

    const name = makeElement("span", "", product.name);

    const removeButton = makeElement("button", "remove-product", "×");

    removeButton.type = "button";

    removeButton.setAttribute("aria-label", `Remove ${product.name}`);

    removeButton.addEventListener("click", () => {
      toggleProduct(product.id);
    });

    chip.append(image, name, removeButton);

    selectedProductsList.appendChild(chip);
  });
}

/* CLEAR ALL SELECTED PRODUCTS */

clearSelections.addEventListener("click", () => {
  if (isSending) return;

  selectedIds = [];

  saveSelections();
  displayProducts();
  displaySelectedProducts();
});

/* =====================================================
   PRODUCT DESCRIPTIONS
   ===================================================== */

function showProductDetails(product) {
  dialogContent.innerHTML = "";

  const image = makeElement("img");

  image.src = product.image;
  image.alt = product.name;

  const brand = makeElement("p", "product-brand", product.brand);

  const name = makeElement("h2", "", product.name);

  const category = makeElement("p", "", `Category: ${product.category}`);

  const description = makeElement(
    "p",
    "",
    product.description || "No description available.",
  );

  dialogContent.append(image, brand, name, category, description);

  productDialog.showModal();
}

// Close product details
closeDialog.addEventListener("click", () => {
  productDialog.close();
});

/* =====================================================
   CHAT MESSAGES
   ===================================================== */

function addChatMessage(text, role, isError = false) {
  const message = makeElement(
    "div",
    `chat-message ${role} ${isError ? "error" : ""}`,
  );

  const label = makeElement(
    "span",
    "chat-label",
    role === "user" ? "You" : "L'Oréal Advisor",
  );

  const bubble = makeElement("div", "chat-bubble", text);

  message.append(label, bubble);

  chatWindow.appendChild(message);

  chatWindow.scrollTop = chatWindow.scrollHeight;

  return message;
}

/* START NEW CHAT */

function startChat() {
  messages = [];

  chatWindow.innerHTML = "";

  addChatMessage(
    "Welcome! Select some products and click Generate My Routine. " +
      "You can also ask me questions about skincare, haircare, makeup, or fragrance.",
    "assistant",
  );
}

/* =====================================================
   CONNECT TO CLOUDFLARE WORKER
   ===================================================== */

// displayText lets us show a shorter message while
// sending the complete question to the AI.
async function sendToAI(question, displayText = question) {
  if (isSending || !question.trim()) return;

  isSending = true;

  // Keep the full question in conversation history
  messages.push({
    role: "user",
    content: question,
  });

  // Display only the user-friendly message
  addChatMessage(displayText, "user");

  const loadingMessage = addChatMessage(
    "Generating your response...",
    "assistant",
  );

  sendBtn.disabled = true;
  newChatBtn.disabled = true;
  userInput.disabled = true;

  displaySelectedProducts();

  try {
    // Send full conversation history to the Worker
    const response = await fetch(WORKER_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        messages: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to connect to OpenAI.");
    }

    // Read the AI response
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error("The AI returned an empty response.");
    }

    // Remember the AI response for follow-up questions
    messages.push({
      role: "assistant",
      content: answer,
    });

    loadingMessage.remove();

    addChatMessage(answer, "assistant");
  } catch (error) {
    loadingMessage.remove();

    // Remove the failed question from API history
    messages.pop();

    addChatMessage(
      `The AI is unavailable: ${error.message}`,
      "assistant",
      true,
    );

    console.error("Chat error:", error);
  } finally {
    isSending = false;

    sendBtn.disabled = false;
    newChatBtn.disabled = false;
    userInput.disabled = false;

    displaySelectedProducts();
  }
}

/* =====================================================
   GENERATE PERSONALIZED ROUTINE
   ===================================================== */

generateRoutine.addEventListener("click", async () => {
  const selected = getSelectedProducts();

  if (selected.length === 0 || isSending) return;

  // Collect only the selected product data
  const productData = selected.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  // Full question sent to the AI
  const question = `
Create a personalized beauty routine using these selected products:

${JSON.stringify(productData, null, 2)}

Explain the correct order of use and when each product
should be applied. Include morning and evening steps
when appropriate. Only use the selected products.
`;

  // Short message shown to the user
  const displayText = `Generate a routine using my ${selected.length} selected products.`;

  // Send full JSON but display shorter text
  await sendToAI(question, displayText);

  // Scroll to chat
  chatWindow.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
});

/* =====================================================
   FOLLOW-UP QUESTIONS
   ===================================================== */

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = userInput.value.trim();

  if (!question || isSending) return;

  userInput.value = "";

  await sendToAI(question);
});

/* NEW CHAT BUTTON */

newChatBtn.addEventListener("click", () => {
  if (isSending) return;

  startChat();
});

/* =====================================================
   PRODUCT SEARCH EVENTS
   ===================================================== */

categoryFilter.addEventListener("change", displayProducts);

productSearch.addEventListener("input", displayProducts);

/* =====================================================
   RTL LANGUAGE SUPPORT
   ===================================================== */

rtlToggle.addEventListener("click", () => {
  const isRTL = document.documentElement.dir === "rtl";

  document.documentElement.dir = isRTL ? "ltr" : "rtl";

  rtlToggle.setAttribute("aria-pressed", String(!isRTL));

  rtlToggle.textContent = isRTL ? "RTL Mode" : "LTR Mode";
});

/* =====================================================
   START APPLICATION
   ===================================================== */

startChat();
loadProducts();
