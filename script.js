// ============================================
// KONFIGURASI SUPABASE - SUDAH BENAR!
// ============================================

const SUPABASE_URL = 'https://poxfyykhljpcqqjtpoyd.supabase.co';  // ✅ Tanpa /rest/v1/
const SUPABASE_ANON_KEY = 'sb_publishable_xzSBoKw406IBltlBKTNMqA_Vw5L4ULX';

// ============================================
// JANGAN UBAH KODE DI BAWAH INI
// ============================================

// Inisialisasi Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel global
let currentUsername = localStorage.getItem('chat_username') || '';
let messagesContainer = document.getElementById('chatMessages');
let usernameInput = document.getElementById('username');
let messageInput = document.getElementById('messageInput');
let sendBtn = document.getElementById('sendBtn');

// Set username awal jika ada
if (currentUsername) {
    usernameInput.value = currentUsername;
}

// Simpan username ke localStorage
usernameInput.addEventListener('change', function() {
    let username = this.value.trim();
    if (username) {
        localStorage.setItem('chat_username', username);
        currentUsername = username;
    }
});

// Format waktu
function formatTime(timestamp) {
    if (!timestamp) return 'Baru saja';
    
    let date = new Date(timestamp);
    let now = new Date();
    let diff = now - date;
    
    if (diff < 60000) return 'Baru saja';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' menit lalu';
    
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Escape HTML untuk keamanan XSS
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Tampilkan pesan di layar
function displayMessage(message) {
    let isOwn = (currentUsername && message.username === currentUsername);
    let timeFormatted = formatTime(message.created_at);
    
    let messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    messageDiv.innerHTML = `
        <div class="message-bubble">
            <span class="message-username">${escapeHtml(message.username)}</span>
            <div class="message-text">${escapeHtml(message.message)}</div>
            <span class="message-time">${timeFormatted}</span>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Muat pesan lama
async function loadOldMessages() {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(100);
        
        if (error) throw error;
        
        const infoBox = messagesContainer.querySelector('.info-box');
        if (infoBox) {
            infoBox.remove();
        }
        
        if (data && data.length > 0) {
            data.forEach(msg => displayMessage(msg));
        }
        
        if (messagesContainer.children.length === 0) {
            let emptyDiv = document.createElement('div');
            emptyDiv.className = 'info-box';
            emptyDiv.innerHTML = '💬 Tidak ada pesan. Jadilah yang pertama berkirim pesan!';
            messagesContainer.appendChild(emptyDiv);
        }
        
    } catch (error) {
        console.error('Error loading messages:', error);
        if (messagesContainer.querySelector('.info-box')) {
            messagesContainer.innerHTML = '<div class="info-box">⚠️ Gagal memuat pesan. Periksa koneksi internet.</div>';
        }
    }
}

// Subscribe ke pesan baru (REALTIME!)
function subscribeToMessages() {
    supabase
        .channel('messages-channel')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
                const emptyInfo = messagesContainer.querySelector('.info-box');
                if (emptyInfo && emptyInfo.innerHTML.includes('Tidak ada pesan')) {
                    emptyInfo.remove();
                }
                displayMessage(payload.new);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', status);
        });
}

// Kirim pesan
async function sendMessage() {
    let username = usernameInput.value.trim();
    let message = messageInput.value.trim();
    
    if (!username) {
        alert('Masukkan nama kamu dulu!');
        usernameInput.focus();
        return;
    }
    
    if (!message) {
        return;
    }
    
    localStorage.setItem('chat_username', username);
    currentUsername = username;
    
    sendBtn.disabled = true;
    sendBtn.textContent = 'Mengirim...';
    
    try {
        const { error } = await supabase
            .from('messages')
            .insert([{ username: username, message: message }]);
        
        if (error) throw error;
        
        messageInput.value = '';
        messageInput.focus();
        
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Gagal mengirim pesan: ' + error.message);
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = '📨 Kirim';
    }
}

// Event handlers
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

// Inisialisasi
async function init() {
    console.log('🚀 Memulai aplikasi chat...');
    await loadOldMessages();
    subscribeToMessages();
    messageInput.focus();
    console.log('✅ Chat siap digunakan!');
}

document.addEventListener('DOMContentLoaded', init);
