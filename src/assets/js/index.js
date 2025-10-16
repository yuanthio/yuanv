const swiper = new Swiper('.swiper', {
  direction: 'horizontal',
  loop: true,
  slidesPerView: 'auto',
  spaceBetween: 30,
  allowTouchMove: true,
  speed: 5000,
  freeMode: {
    enabled: true,
    momentum: false,
  },
  autoplay: {
    delay: 0,
    disableOnInteraction: false,
    pauseOnMouseEnter: true,
    reverseDirection: true,
  },
});

document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.getElementById("theme-toggle");
  const icon = document.getElementById("theme-icon");
  const body = document.body;

  if (localStorage.getItem("theme") === "dark") {
    body.classList.add("dark-mode");
    icon.classList.replace("bi-moon-fill", "bi-sun-fill");
  }

  toggleButton.addEventListener("click", () => {
    body.classList.toggle("dark-mode");

    const isDark = body.classList.contains("dark-mode");

    if (isDark) {
      icon.classList.replace("bi-moon-fill", "bi-sun-fill");
      localStorage.setItem("theme", "dark");
    } else {
      icon.classList.replace("bi-sun-fill", "bi-moon-fill");
      localStorage.setItem("theme", "light");
    }
  });
});

