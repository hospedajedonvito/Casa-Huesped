document.addEventListener("DOMContentLoaded", function () {
    
    // --- 1. Control automático del Carrusel superior ---
    const slides = document.querySelectorAll(".carousel-slide");
    let currentSlide = 0;
    const slideInterval = 4000; 

    function nextSlide() {
        slides[currentSlide].classList.remove("active");
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add("active");
    }

    if(slides.length > 0) {
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
                targetSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    }

    // --- 3. Lógica del Formulario de Reserva ---
    const reservaForm = document.getElementById('reservaForm');
    if (reservaForm) {
        // La misma URL que usas para el POST
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKyR1N142pR1fm_iU2jlmL8NbrgHimhxFUB3cNLirS_DFHV0X9nt8KZpRPnug6bCsf/exec';

        reservaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnEnviar');
            
            const checkin = document.getElementById('checkin').value;
            const checkout = document.getElementById('checkout').value;

            // --- 3.1 Verificación de disponibilidad ---
            btn.disabled = true;
            btn.innerText = 'Verificando disponibilidad...';

            try {
                // Consultamos las fechas ocupadas (esto usa el doGet que agregaste al script)
                const respuesta = await fetch(SCRIPT_URL);
                const reservas = await respuesta.json();

                // Comparamos si la fecha elegida está en el rango de alguna reserva
                const esConflicto = reservas.some(r => {
                    return (checkin >= r.inicio && checkin <= r.fin) || (checkout >= r.inicio && checkout <= r.fin);
                });

                if (esConflicto) {
                    alert("⚠️ Lo sentimos, esas fechas ya están reservadas. Por favor elige otras.");
                    btn.disabled = false;
                    btn.innerText = 'Enviar Solicitud y Reservar';
                    return; // Detenemos el envío
                }

                // --- 3.2 Envío de la reserva ---
                btn.innerText = 'Enviando a Graciela...';
                const nombre = document.getElementById('nombre').value;
                const telefono = document.getElementById('telefono').value;

                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, telefono, checkin, checkout })
                });

                // --- CORRECCIÓN APLICADA AQUÍ ---
                const mensaje = `Hola Graciela! Quiero realizar una nueva reserva:\n\n👤 *Nombre:* ${nombre}\n📞 *Tel:* ${telefono}\n🗓️ *Check-in:* ${checkin}\n📅 *Check-out:* ${checkout}`;
                window.open(`https://wa.me/5491154523758?text=${encodeURIComponent(mensaje)}`, '_blank');
                // --------------------------------

                alert('¡Solicitud registrada correctamente! Se abrirá WhatsApp para confirmar con Graciela.');
                reservaForm.reset();
                btn.disabled = false;
                btn.innerText = 'Enviar Solicitud y Reservar';

            } catch (error) {
                console.error("Error:", error);
                alert("Hubo un error al enviar. Intenta nuevamente.");
                btn.disabled = false;
                btn.innerText = 'Enviar Solicitud y Reservar';
            }
        });
    }
});
