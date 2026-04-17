import { auth, googleProvider, facebookProvider } from './firebase-config.js';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let updateCartUIFn = null;

export function setUpdateCartUI(fn) { updateCartUIFn = fn; }

function saveUser(user, nombreExtra = null) {
    if (!user) return;
    const userData = {
        uid: user.uid,
        name: nombreExtra || user.displayName || user.email?.split('@')[0] || 'Cliente',
        email: user.email,
        photo: user.photoURL,
        primeraCompra: true,
        fechaRegistro: new Date().toISOString()
    };
    localStorage.setItem('lumaUser', JSON.stringify(userData));
    
    let clientes = JSON.parse(localStorage.getItem('lumaClientes')) || [];
    if (!clientes.find(c => c.uid === user.uid)) {
        clientes.push(userData);
        localStorage.setItem('lumaClientes', JSON.stringify(clientes));
    }
    
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) userNameSpan.innerText = userData.name.split(' ')[0];
    
    const modal = document.getElementById('registerModal');
    if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    
    showNotification(`¡Bienvenida ${userData.name}! ✨`);
    if (updateCartUIFn) updateCartUIFn();
}

export function getCurrentUser() { return JSON.parse(localStorage.getItem('lumaUser')); }

export async function cerrarSesion() {
    try {
        await signOut(auth);
        localStorage.removeItem('lumaUser');
        localStorage.removeItem('lumaCart');
        document.getElementById('userName').innerText = 'Invitado';
        window.location.reload();
    } catch (error) { console.error(error); }
}

export async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        saveUser(result.user);
    } catch (error) { showNotification("Error al iniciar con Google"); }
}

export async function loginWithFacebook() {
    try {
        const result = await signInWithPopup(auth, facebookProvider);
        saveUser(result.user);
    } catch (error) { showNotification("Error al iniciar con Facebook"); }
}

export async function registerWithEmail() {
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const nombre = document.getElementById('regName')?.value;
    if (!email || !password || !nombre) { showNotification("Completa todos los campos"); return; }
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        saveUser(result.user, nombre);
    } catch (error) {
        showNotification(error.code === 'auth/email-already-in-use' ? "Este email ya está registrado" : "Error al registrar");
    }
}

export async function loginWithEmail() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    if (!email || !password) { showNotification("Completa todos los campos"); return; }
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        saveUser(result.user);
    } catch (error) { showNotification("Email o contraseña incorrectos"); }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification fixed bottom-4 right-4 bg-[#4d4845] text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        const savedUser = getCurrentUser();
        if (!savedUser || savedUser.uid !== user.uid) saveUser(user);
        else {
            const userNameSpan = document.getElementById('userName');
            if (userNameSpan && savedUser) userNameSpan.innerText = savedUser.name.split(' ')[0];
            if (updateCartUIFn) updateCartUIFn();
        }
    } else {
        localStorage.removeItem('lumaUser');
        const userNameSpan = document.getElementById('userName');
        if (userNameSpan) userNameSpan.innerText = 'Invitado';
    }
});

export function showLoginForm() {
    document.getElementById('registerFormContainer')?.classList.add('hidden');
    document.getElementById('loginFormContainer')?.classList.remove('hidden');
}

export function showRegisterForm() {
    document.getElementById('loginFormContainer')?.classList.add('hidden');
    document.getElementById('registerFormContainer')?.classList.remove('hidden');
}

export function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

export function showRegisterModal() {
    if (!getCurrentUser()) {
        const modal = document.getElementById('registerModal');
        if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    }
}

// Exponer funciones globales para los onclick del HTML
window.loginWithGoogle = loginWithGoogle;
window.loginWithFacebook = loginWithFacebook;
window.registerWithEmail = registerWithEmail;
window.loginWithEmail = loginWithEmail;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.closeRegisterModal = closeRegisterModal;
window.showRegisterModal = showRegisterModal;
window.cerrarSesion = cerrarSesion;