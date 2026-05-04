const calendarEl = document.getElementById("calendar");
const monthLabel = document.getElementById("month-label");
const slotsEl = document.getElementById("time-slots");

let currentDate = new Date();

function renderCalendar(date) {
  calendarEl.innerHTML = "";
  const year = date.getFullYear();
  const month = date.getMonth();

  monthLabel.textContent = date.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  // Padding empty cells
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const btn = document.createElement("button");
    btn.textContent = day;

    btn.onclick = () => loadSlots(year, month, day);
    grid.appendChild(btn);
  }

  calendarEl.appendChild(grid);
}

function loadSlots(year, month, day) {
  slotsEl.innerHTML = "";

  // Placeholder — will later fetch from server
  const times = ["09:00", "09:30", "10:00", "10:30"];

  times.forEach(time => {
    const btn = document.createElement("button");
    btn.textContent = time;
    btn.onclick = () => alert(`Selected ${year}-${month+1}-${day} ${time}`);
    slotsEl.appendChild(btn);
  });
}

document.getElementById("prev").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
};

document.getElementById("next").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
};

renderCalendar(currentDate);
