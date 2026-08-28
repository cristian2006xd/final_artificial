document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const textInput = document.getElementById('textInput');
    const fileInput = document.getElementById('fileInput');
    const attachBtn = document.getElementById('attachBtn');
    const suggFile = document.getElementById('suggFile');
    const messagesContainer = document.getElementById('messagesContainer');
    const emptyState = document.getElementById('emptyState');
    const typingIndicator = document.getElementById('typingIndicator');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('previewImg');
    const removeImgBtn = document.getElementById('removeImgBtn');
    const scrollContainer = document.getElementById('scrollContainer');

    let selectedFile = null;

    attachBtn.addEventListener('click', () => fileInput.click());
    suggFile.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            selectedFile = file;
            const reader = new FileReader();
            reader.onload = (evt) => {
                previewImg.src = evt.target.result;
                imagePreviewContainer.style.display = 'inline-flex';
            };
            reader.readAsDataURL(file);
        }
    });

    removeImgBtn.addEventListener('click', () => {
        selectedFile = null;
        imagePreviewContainer.style.display = 'none';
        fileInput.value = '';
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = textInput.value.trim();
        if (!text && !selectedFile) return;

        if (emptyState) emptyState.style.display = 'none';

        const userBubbleContent = [];
        let imageUrl = null;
        if (selectedFile) {
            imageUrl = previewImg.src;
            userBubbleContent.push(`<img src="${imageUrl}" class="message-image" />`);
        }
        if (text) {
            userBubbleContent.push(`<p>${escapeHtml(text)}</p>`);
        }

        appendMessage('user', userBubbleContent);

        const formData = new FormData();
        if (text) formData.append('text', text);
        if (selectedFile) formData.append('file', selectedFile);

        textInput.value = '';
        selectedFile = null;
        imagePreviewContainer.style.display = 'none';
        fileInput.value = '';

        typingIndicator.style.display = 'flex';
        scrollToBottom();

        try {
            let botReply = "¡Hola! Sube una imagen para evaluarla con el modelo.";

            if (formData.has('file')) {
                const response = await fetch('/predict', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (response.ok) {
                    botReply = `🔍 **Resultado Caltech101:**\n- Clase: **${data.clase}**\n- Confianza: **${data.confianza}**`;
                } else {
                    botReply = `❌ Error: ${data.error}`;
                }
            }

            typingIndicator.style.display = 'none';
            appendMessage('bot', `<p style="white-space: pre-wrap;">${escapeHtml(botReply)}</p>`);
        } catch (err) {
            typingIndicator.style.display = 'none';
            appendMessage('bot', `<p>❌ Error de conexión con el servidor.</p>`);
        }
    });

    function appendMessage(sender, htmlContent) {
        const row = document.createElement('div');
        row.className = `message-row ${sender === 'user' ? 'user-row' : 'bot-row'}`;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = sender === 'user' ? '🧑' : '🤖';

        const bubble = document.createElement('div');
        bubble.className = `bubble ${sender === 'user' ? 'user-bubble' : 'bot-bubble'}`;

        if (Array.isArray(htmlContent)) {
            htmlContent.forEach(item => bubble.innerHTML += item);
        } else {
            bubble.innerHTML = htmlContent;
        }

        if (sender === 'user') {
            row.appendChild(bubble);
            row.appendChild(avatar);
        } else {
            row.appendChild(avatar);
            row.appendChild(bubble);
        }

        messagesContainer.appendChild(row);
        scrollToBottom();
    }

    function scrollToBottom() {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
});