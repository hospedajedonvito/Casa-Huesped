document.addEventListener("DOMContentLoaded", function () {
    
    // URL de tus dos Google Apps Scripts
    const SCRIPT_RESERVAS_URL = 'https://script.google.com/macros/s/AKfycbw-TVssZamZXgKl9m5RFZTsq-8imf7pBE-xKbnsXFWT-kVkMdJ-rrrA-hrNXnS0wE6X/exec';
    const SCRIPT_OPINIONES_URL = 'https://script.google.com/macros/s/AKfycby4Dh2bu3X5ZYEtAUE2Y6fIkgjo09a8ohyizvk_-G0wOJLipRhnKg9xha4YJNgbdeNw/exec';

    // Variables globales para los calendarios interactivos
    let fpCheckin, fpCheckout;

    // --- 1. Control automático del Carrusel superior ---
    const slides = document.querySelectorAll(".carousel-slide");
    let currentSlide = 0;
    const slideInterval = 4000; 

    function nextSlide() {
        if(slides.length > 0) {
            slides[currentSlide].classList.remove("active");
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add("active");
        }
    }
    
    if(slides.length > 0) {
        slides.forEach((slide, index) => {
            if (index === 0) {
                slide.classList.add("active");
            } else {
                slide.classList.remove("active");
            }
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

    // Función auxiliar para normalizar formatos de fecha (p. ej. DD/MM/YYYY a YYYY-MM-DD)
    function formatearFecha(fechaStr) {
        if (!fechaStr) return null;
        let str = String(fechaStr).trim();
        // Si viene con formato DD/MM/YYYY
        if (str.includes('/')) {
            let partes = str.split('/');
            if (partes[0].length <= 2 && partes[2].length === 4) {
                return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            }
        }
        // Si ya viene con formato YYYY-MM-DD o ISO estándar
        if (str.includes('-')) {
            return str.split('T')[0];
        }
        return str;
    }

    // --- 3. Inicialización y Bloqueo del Calendario en Tiempo Real ---
    async function inicializarCalendarios() {
        let fechasDeshabilitadas = [];

        try {
            const respuesta = await fetch(SCRIPT_RESERVAS_URL);
            if (respuesta.ok) {
                const reservas = await respuesta.json();
                console.log("Reservas detectadas desde Sheets:", reservas);
                
                reservas.forEach(reserva => {
                    // Tolerancia a mayúsculas/minúsculas en el Sheets (inicio, fin, INICIO, FIN)
                    let inicioRaw = reserva.inicio || reserva.INICIO || reserva.Inicio;
                    let finRaw = reserva.fin || reserva.FIN || reserva.Fin;

                    let inicioFormateado = formatearFecha(inicioRaw);
                    let finFormateado = formatearFecha(finRaw);

                    if (inicioFormateado && finFormateado) {
                        fechasDeshabilitadas.push({
                            from: inicioFormateado,
                            to: finFormateado
                        });
                    }
                });
            }
        } catch (error) {
            console.warn("No se pudieron mapear los días ocupados desde la planilla:", error);
        }

        console.log("Fechas estructuradas para bloquear:", fechasDeshabilitadas);

        // Inicializador para Check-in
        fpCheckin = flatpickr("#checkin", {
            locale: "es",
            minDate: "today",
            dateFormat: "Y-m-d",
            disable: fechasDeshabilitadas,
            onChange: function(selectedDates, dateStr) {
                if(fpCheckout) {
                    fpCheckout.set("minDate", dateStr || "today");
                }
            }
        });

        // Inicializador para Check-out
        fpCheckout = flatpickr("#checkout", {
            locale: "es",
            minDate: "today",
            dateFormat: "Y-m-d",
            disable: fechasDeshabilitadas
        });
    }

    // Lanzamos la inicialización
    inicializarCalendarios();

    // --- 4. Lógica del Formulario de Reserva ---
    const reservaForm = document.getElementById('reservaForm');
    if (reservaForm) {
        reservaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnEnviarReserva');
            
            const checkin = document.getElementById('checkin').value;
            const checkout = document.getElementById('checkout').value;
            const nombre = document.getElementById('nombre').value;
            const telefono = document.getElementById('telefono').value;

            if (!checkin || !checkout) {
                alert("⚠️ Por favor selecciona las fechas de ingreso y salida desde el calendario.");
                return;
            }

            if (checkin >= checkout) {
                alert("⚠️ La fecha de check-out debe ser posterior a la fecha de check-in.");
                return;
            }

            btn.disabled = true;
            btn.innerText = 'Enviando a Graciela...';

            try {
                await fetch(SCRIPT_RESERVAS_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, telefono, checkin, checkout })
                });
            } catch (postError) {
                console.error("Error al registrar en Google Sheets:", postError);
            }

            const mensaje = "Hola Graciela! Quiero realizar una nueva reserva:\n\n" +
                            "*NOMBRE:* " + nombre + "\n" +
                            "*TEL:* " + telefono + "\n" +
                            "*CHECK-IN:* " + checkin + "\n" +
                            "*CHECK-OUT:* " + checkout;
            
            window.open("https://wa.me/5491154523758?text=" + encodeURIComponent(mensaje), '_blank');

            alert('¡Solicitud enviada! Se abrirá WhatsApp para confirmar la disponibilidad final con Graciela.');
            reservaForm.reset();
            
            if(fpCheckin) fpCheckin.clear();
            if(fpCheckout) fpCheckout.clear();
            
            inicializarCalendarios();

            btn.disabled = false;
            btn.innerText = 'Enviar Solicitud y Reservar';
        });
    }

    // --- 5. Sistema de Opiniones (Cargar y Enviar) ---
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

    cargarComentarios();
});
