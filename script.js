document.addEventListener("DOMContentLoaded", function () {
    
    // URL de tus dos Google Apps Scripts (¡VINCULADAS CORRECTAMENTE!)
    const SCRIPT_RESERVAS_URL = 'https://script.google.com/macros/s/AKfycbzKyR1N142pR1fm_iU2jlmL8NbrgHimhxFUB3cNLirS_DFHV0X9nt8KZpRPnug6bCsf/exec';
    const SCRIPT_OPINIONES_URL = 'https://script.google.com/macros/s/AKfycby4Dh2bu3X5ZYEtAUE2Y6fIkgjo09a8ohyizvk_-G0wOJLipRhnKg9xha4YJNgbdeNw/exec';

    // --- 1. Control automático del Carrusel superior ---
    const slides = document.querySelectorAll(".carousel-slide");
    let currentSlide = 0;
    const slideInterval = 4000; 

    function nextSlide() {
        if(slides.length > 0) {
            slides[currentSlide].style.display = "none"; 
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].style.display = "block";
        }
    }
    if(slides.length > 0) {
        slides.forEach((slide, index) => {
            slide.style.display = index === 0 ? "block" : "none";
        });
        setInterval(nextSlide, slideInterval);
    }

    // --- 2. Desplazamiento suave para el menú ---
    const links = document.querySelectorAll(".nav-links a");
    for (const link of links) {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const targetId = this.getAttribute("href");
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const checkbox = document.getElementById('menu-toggle');
                if (checkbox) checkbox.checked = false;

                targetSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    }

    // --- 3. Lógica del Formulario de Reserva (CAMBIADO Y OPTIMIZADO) ---
    const reservaForm = document.getElementById('reservaForm');
    if (reservaForm) {
        reservaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnEnviarReserva');
            
            const checkin = document.getElementById('checkin').value;
            const checkout = document.getElementById('checkout').value;
            const nombre = document.getElementById('nombre').value;
            const telefono = document.getElementById('telefono').value;

            // Filtro de seguridad inicial
            if (checkin >= checkout) {
                alert("⚠️ La fecha de check-out debe ser posterior a la fecha de check-in.");
                return;
            }

            btn.disabled = true;
            btn.innerText = 'Verificando disponibilidad...';

            try {
                // Buscamos la disponibilidad usando la variable correcta
                const respuesta = await fetch(SCRIPT_RESERVAS_URL);
                const reservas = await respuesta.json();

                // CORRECCIÓN: Comparamos de forma estricta que los rangos de fecha no se superpongan
                const esConflicto = reservas.some(r => {
                    return (checkin <= r.fin && checkout >= r.inicio);
                });

                if (esConflicto) {
                    alert("⚠️ Lo sentimos, esas fechas ya están reservadas o se superponen con otra estadía. Por favor elige otras.");
                    btn.disabled = false;
                    btn.innerText = 'Enviar Solicitud y Reservar';
                    return; 
                }

                btn.innerText = 'Enviando a Graciela...';

                // Enviamos la petición POST al script de reservas
                await fetch(SCRIPT_RESERVAS_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, telefono, checkin, checkout })
                });

                // Construcción sólida del mensaje para WhatsApp sin símbolos extraños
                const mensaje = "Hola Graciela! Quiero realizar una nueva reserva:\n\n" +
                                "👤 *Nombre:* " + nombre + "\n" +
                                "📞 *Tel:* " + telefono + "\n" +
                                "🗓️ *Check-in:* " + checkin + "\n" +
                                "📅 *Check-out:* " + checkout;
                
                window.open("https://wa.me/5491154523758?text=" + encodeURIComponent(mensaje), '_blank');

                alert('¡Solicitud registrada correctamente! Se abrirá WhatsApp para confirmar con Graciela.');
                reservaForm.reset();

            } catch (error) {
                console.error("Error:", error);
                alert("Hubo un error al procesar tu reserva. Intenta nuevamente.");
            } finally {
                btn.disabled = false;
                btn.innerText = 'Enviar Solicitud y Reservar';
            }
        });
    }

    // --- 4. Sistema de Opiniones (Cargar y Enviar) ---
    const listaComentarios = document.getElementById('listaComentarios');
    const reviewForm = document.getElementById('reviewForm');

    async function cargarComentarios() {
        if (!listaComentarios) return;
        try {
            const respuesta = await fetch(SCRIPT_OPINIONES_URL);
            const comentarios = await respuesta.json();
            
            if(!comentarios || comentarios.length === 0) {
                listaComentarios.innerHTML = '<p style="text-align:center; color:#888;">Todavía no hay opiniones. ¡Sé el primero!</p>';
                return;
            }

            listaComentarios.innerHTML = '';
            comentarios.forEach(c => {
                let estrellas = '★'.repeat(c.puntuacion) + '☆'.repeat(5 - c.puntuacion);
                const card = document.createElement('div');
                card.className = 'comment-card';
                card.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-name">${c.nombre}</span>
                        <span class="comment-stars">${estrellas}</span>
                    </div>
                    <p class="comment-text">${c.comentario}</p>
                `;
                listaComentarios.appendChild(card);
            });
        } catch (error) {
            listaComentarios.innerHTML = '<p style="text-align:center; color:red;">No se pudieron cargar las opiniones.</p>';
        }
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnEnviarComentario');
            btn.disabled = true;
            btn.innerText = 'Enviando...';

            const datos = {
                nombre: document.getElementById('formNombre').value,
                puntuacion: document.querySelector('input[name="puntuacion"]:checked').value,
                comentario: document.getElementById('formComentario').value
            };

            try {
                await fetch(SCRIPT_OPINIONES_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });
                
                alert('¡Gracias por tu comentario!');
                reviewForm.reset();
                cargarComentarios(); 
            } catch (error) {
                alert('Hubo un error al enviar el comentario.');
            } finally {
                btn.disabled = false;
                btn.innerText = 'Enviar Comentario';
            }
        });
    }

    // Ejecución inicial de comentarios
    cargarComentarios();
});
