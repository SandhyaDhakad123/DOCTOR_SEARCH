// Filter doctors by name and specialization
function filterDoctors() {
  const nameInput = document.getElementById("searchByName")?.value.toLowerCase() || "";
  const specInput = document.getElementById("searchBySpecialization")?.value.toLowerCase() || "";
  const doctorCards = document.querySelectorAll(".doctor-card");

  doctorCards.forEach(card => {
    const name = card.querySelector("h2")?.textContent.toLowerCase() || "";
    const specialization = card.querySelector("p")?.textContent.toLowerCase() || "";

    const nameMatch = name.includes(nameInput);
    const specMatch = specialization.includes(specInput);

    card.style.display = nameMatch && specMatch ? "block" : "none";
  });
}

// Run after DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Toggle doctor details when clicking their name
  document.querySelectorAll(".toggle-doctor").forEach(name => {
    name.addEventListener("click", () => {
      const details = name.nextElementSibling?.nextElementSibling;
      if (details) {
        const isVisible = details.style.display === "block";
        details.style.display = isVisible ? "none" : "block";
      }
    });
  });

  // Appointment form handling
  const appointmentForm = document.getElementById("appointmentForm");
  if (appointmentForm) {
    appointmentForm.addEventListener("submit", function (e) {
      e.preventDefault();
      alert("✅ Appointment request submitted successfully!");
      this.reset();
    });
  }
});