export function initWorld() {
  const viewport = document.querySelector("#map-viewport");
  if (!viewport) return;
  const map = document.querySelector("#map-art");
  const note = document.querySelector("#map-note");
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let drag = null;
  const updateTransform = () => { map.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`; };
  const changeScale = (amount) => {
    scale = Math.min(2.5, Math.max(.8, scale + amount));
    updateTransform();
  };
  document.querySelector("#map-zoom-in").addEventListener("click", () => changeScale(.15));
  document.querySelector("#map-zoom-out").addEventListener("click", () => changeScale(-.15));
  document.querySelector("#map-reset").addEventListener("click", () => { scale = 1; offsetX = 0; offsetY = 0; updateTransform(); });
  document.querySelector("#map-atmosphere").addEventListener("change", (event) => {
    map.classList.remove("is-sunset", "is-rain");
    if (event.target.value !== "night") map.classList.add(`is-${event.target.value}`);
  });
  map.querySelectorAll(".map-marker").forEach((marker, index) => {
    const reveal = (event) => {
      event.stopPropagation();
      note.textContent = `${marker.dataset.label} ${index + 1}. Описание и связанные главы появятся после добавления авторских материалов.`;
    };
    marker.addEventListener("click", reveal);
    marker.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        reveal(event);
      }
    });
  });
  viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".map-marker")) return;
    drag = { x: event.clientX - offsetX, y: event.clientY - offsetY, pointerId: event.pointerId };
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    offsetX = event.clientX - drag.x;
    offsetY = event.clientY - drag.y;
    updateTransform();
  });
  const stopDrag = (event) => {
    if (drag?.pointerId === event.pointerId) drag = null;
  };
  viewport.addEventListener("pointerup", stopDrag);
  viewport.addEventListener("pointercancel", stopDrag);
  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    changeScale(event.deltaY < 0 ? .08 : -.08);
  }, { passive: false });
}
