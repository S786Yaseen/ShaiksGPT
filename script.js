// UI Elements
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const welcomeScreen = document.getElementById('welcome-screen');
const historyList = document.getElementById('history-list');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.querySelector('.sidebar');

// State
let currentChatId = null;
let chats = JSON.parse(localStorage.getItem('shaiksgpt_chats')) || [];

// Initialize
function init() {
    loadTheme();
    renderHistory();
    if (chats.length > 0) {
        // Load most recent chat
        loadChat(chats[0].id);
    } else {
        startNewChat();
    }
}

// Theme Management
function loadTheme() {
    const isDark = localStorage.getItem('shaiksgpt_theme') === 'dark';
    if (isDark) {
        document.body.classList.replace('light-theme', 'dark-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.replace('dark-theme', 'light-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-theme');
    if (isDark) {
        document.body.classList.replace('dark-theme', 'light-theme');
        localStorage.setItem('shaiksgpt_theme', 'light');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        document.body.classList.replace('light-theme', 'dark-theme');
        localStorage.setItem('shaiksgpt_theme', 'dark');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
});

// Mobile Sidebar Toggle
mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// Chat History Management
function startNewChat() {
    currentChatId = Date.now().toString();
    chatBox.innerHTML = '';
    chatBox.appendChild(welcomeScreen);
    welcomeScreen.style.display = 'flex';
    document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
}

newChatBtn.addEventListener('click', startNewChat);

function saveMessage(role, content) {
    let chat = chats.find(c => c.id === currentChatId);

    if (!chat) {
        // Create new chat
        chat = {
            id: currentChatId,
            title: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
            messages: [],
            timestamp: Date.now()
        };
        chats.unshift(chat);
    }

    chat.messages.push({ role, content });
    chat.timestamp = Date.now();

    // Sort by newest
    chats.sort((a, b) => b.timestamp - a.timestamp);
    localStorage.setItem('shaiksgpt_chats', JSON.stringify(chats));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        div.innerHTML = `<i class="fa-regular fa-message"></i> <span>${chat.title}</span>`;
        div.onclick = () => loadChat(chat.id);
        historyList.appendChild(div);
    });
}

function loadChat(id) {
    currentChatId = id;
    const chat = chats.find(c => c.id === id);
    chatBox.innerHTML = '';
    welcomeScreen.style.display = 'none';

    if (chat && chat.messages) {
        chat.messages.forEach(msg => {
            appendMessageUI(msg.role, msg.content, false);
        });
    }
    renderHistory();
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

// Message Rendering
function appendMessageUI(role, content, animate = false) {
    if (welcomeScreen.style.display !== 'none') {
        welcomeScreen.style.display = 'none';
    }

    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${role}-wrapper`;

    if (role === 'bot') {
        const icon = document.createElement('div');
        icon.className = 'bot-icon';
        icon.innerHTML = '<i class="fa-solid fa-robot"></i>';
        wrapper.appendChild(icon);
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    if (role === 'bot') {
        msgDiv.innerHTML = content.replace(/\n/g, '<br>');
    } else {
        msgDiv.innerText = content;
    }

    wrapper.appendChild(msgDiv);
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;

    return msgDiv; // Return for updating loading state
}

// Send Message
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    if (!currentChatId) startNewChat();

    // UI Updates
    appendMessageUI('user', message);
    userInput.value = '';
    saveMessage('user', message);

    // Typing Indicator
    const typingWrapper = document.createElement('div');
    typingWrapper.className = 'message-wrapper bot-wrapper';
    typingWrapper.innerHTML = `
        <div class="bot-icon"><i class="fa-solid fa-robot"></i></div>
        <div class="message bot">
            <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
    `;
    chatBox.appendChild(typingWrapper);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch('https://shaiksgpt.onrender.com/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();
        chatBox.removeChild(typingWrapper); // Remove typing indicator

        let reply = '';
        if (response.ok) {
            reply = data.response;
        } else {
            reply = 'Error: ' + (data.error || 'Something went wrong');
            if (data.details) reply += `<br><small>${data.details}</small>`;
        }

        appendMessageUI('bot', reply);
        saveMessage('bot', reply);

    } catch (error) {
        chatBox.removeChild(typingWrapper);
        appendMessageUI('bot', 'Error: Unable to connect to the server.');
    }
}

// Allow pressing Enter to send
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Run init on load
init();