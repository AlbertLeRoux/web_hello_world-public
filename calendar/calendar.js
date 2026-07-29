const calendarEl = document.getElementById("calendar");
const monthLabel = document.getElementById("month-label");
const slotsEl = document.getElementById("time-slots");

let currentDate = new Date();

// 
function loadMonthAvailability(year, month) {
    const mm = String(month + 1).padStart(2, "0");

    return fetch(`/api/availability/month?year=${year}&month=${mm}`)
        .then(response => response.json());
}


function renderCalendar(date) {
  calendarEl.innerHTML = "";

  const year = date.getFullYear();
  const month = date.getMonth();

  monthLabel.textContent = date.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  loadMonthAvailability(year, month).then(availableDates => {
    const availableSet = new Set(availableDates);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    // Padding cells
    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(document.createElement("div"));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const btn = document.createElement("button");
      btn.textContent = day;

      const yyyy = year;
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Shade days with availability
      if (availableSet.has(dateStr)) {
        btn.classList.add("available");
      }

      btn.onclick = () => loadSlots(year, month, day);
      grid.appendChild(btn);
    }

    calendarEl.appendChild(grid);
  });
}
function loadSlots(year, month, day) {
    slotsEl.innerHTML = "";

    // Placeholder — will later fetch from server
    //   const times = ["09:00", "09:30", "10:00", "10:30"];
    //  times.forEach(time => {
    //    const btn = document.createElement("button");
    //    btn.textContent = time;
    //    btn.onclick = () => alert(`Selected ${year}-${month+1}-${day} ${time}`);
    //    slotsEl.appendChild(btn);
    //  });

//JavaScript uses a 0 based number for month, so we update that below
    const yyyy = year;
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    fetch(`/api/availability?date=${dateStr}`)
        .then(response => {
            // console.log("HTTP status:", response.status);
            return response.json();
        })
        .then(data => {
            slotsEl.innerHTML = "";
            // console.log ("Raw Data:",data);
            
            data.forEach(slot => {
                // console.log("Slot:", slot);
                const btn = document.createElement("button");

                // Extract HH:MM from "YYYY-MM-DD HH:MM:SS"
                const time = slot.start.split("T")[1].slice(0, 5);
                btn.textContent = time;

                btn.onclick = () => {
                    alert(`Selected ${dateStr} ${time}`);
                };

                slotsEl.appendChild(btn);
            })
        })
        .catch(err => {
            console.error("Fetch error:", err);
        })


};

document.getElementById("prev").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
};

document.getElementById("next").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
};


renderCalendar(currentDate);

// Automatically load slots for today on initial render
loadSlots(
  currentDate.getFullYear(),
  currentDate.getMonth(),
  currentDate.getDate()
);
