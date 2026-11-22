// Initial public availability configuration.
// These will eventually come from the personnel and activity APIs.
const PERSONNEL_CODE = 'CGXP001';
const ACTIVITY_TYPE = 'audit';

const availabilityGrid = document.getElementById('availabilityGrid');
const previousButton = document.getElementById('previousMonth');
const nextButton = document.getElementById('nextMonth');

const DISPLAY_MONTHS = 3;

let currentRows = [];
let initialDisplayYear = null;
let initialDisplayMonth = null;


/*
 * Return today's local calendar date in YYYY-MM-DD format.
 *
 * The availability API expects the browser to explicitly pass
 * an anchor date.
 */
function getTodayAnchor() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/*
 * Determine if a week is in the past, so that the formatting can be updated.
 */
function isHistoricalWeek(week) {
    const today = getTodayAnchor();

    return week.week_end < today;
}

/*
 * Add or subtract whole calendar days from a YYYY-MM-DD value.
 */
function addDays(dateString, days) {
    const [year, month, day] =
        dateString.split('-').map(Number);

    const date = new Date(
        year,
        month - 1, //Remember dates in JS is 0 based and my data is 1 based.
        day
    );

    date.setDate(
        date.getDate() + days
    );

    const updatedYear = date.getFullYear();

    const updatedMonth = String(
        date.getMonth() + 1
    ).padStart(2, '0');

    const updatedDay = String(
        date.getDate()
    ).padStart(2, '0');

    return `${updatedYear}-${updatedMonth}-${updatedDay}`;
}

/*
 * Return the year and month of the first display period
 * represented by the API response.
 */
function getFirstDisplayPeriod(rows) {
    if (rows.length === 0) {
        return null;
    }

    return {
        year: rows[0].iso_year,
        month: rows[0].display_month
    };
}

/*
 * Prevent browsing earlier than the initial current-month window.
 */
function updatePreviousButton() {
    const currentPeriod =
        getFirstDisplayPeriod(currentRows);

    if (!currentPeriod) {
        previousButton.disabled = true;
        return;
    }

    previousButton.disabled =
        currentPeriod.year === initialDisplayYear &&
        currentPeriod.month === initialDisplayMonth;
}

/*
 * Group the flat availability rows returned by the API into
 * their stored ISO-year/display-month combinations.
 */
function groupByDisplayMonth(rows) {
    const groups = new Map();

    for (const row of rows) {
        const key = `${row.iso_year}-${row.display_month}`;

        if (!groups.has(key)) {
            groups.set(key, {
                year: row.iso_year,
                month: row.display_month,
                weeks: []
            });
        }

        groups.get(key).weeks.push(row);
    }

    return Array.from(groups.values());
}

/*
 * Determine whether the returned dataset contains the full
 * configured display window.
 */
function hasFullDisplayWindow(rows) {
    const groups = groupByDisplayMonth(rows);

    return groups.length === DISPLAY_MONTHS;
}

/*
 * Convert a database month/year into the month-card heading.
 *
 * Database:
 *   2026, 11
 *
 * Display:
 *   November 2026
 */
function getMonthHeading(year, month) {
    const date = new Date(year, month - 1, 1);

    return date.toLocaleDateString(
        'en-US',
        {
            month: 'long',
            year: 'numeric'
        }
    );
}


/*
 * Convert a YYYY-MM-DD database date into the short form
 * used by the week cards.
 *
 * 2026-11-16 -> Nov 16
 */
function formatWeekDate(dateString) {
    const [year, month, day] =
        dateString.split('-').map(Number);

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString(
        'en-US',
        {
            month: 'short',
            day: 'numeric'
        }
    );
}


/*
 * Translate database status values into the existing CSS
 * classes and public-facing labels.
 */
function getStatusPresentation(status) {
    const statusMap = {
        undefined: {
            cssClass: 'is-undefined',
            label: 'Not Defined'
        },

        available: {
            cssClass: 'is-available',
            label: 'Available'
        },

        partial: {
            cssClass: 'is-partial',
            label: 'Partial Availability'
        },

        unavailable: {
            cssClass: 'is-unavailable',
            label: 'Unavailable'
        }
    };

    return statusMap[status] || null;
}

/*
 * Create one week card from one availability database row.
 */
function createWeekRow(week) {
    const presentation =
        getStatusPresentation(week.status);

    if (!presentation) {
        return null;
    }

    const weekRow = document.createElement('div');

    const cssClass = isHistoricalWeek(week)
        ? 'is-historical'
        : presentation.cssClass;

    weekRow.className =
        `week-row ${cssClass}`;

    const heading = document.createElement('div');
    heading.className = 'week-heading';


    const weekNumber = document.createElement('strong');
    weekNumber.textContent = `Week ${week.iso_week}`;


    const status = document.createElement('span');
    status.className = 'week-status';
    status.textContent = presentation.label;


    heading.append(
        weekNumber,
        status
    );


    const dates = document.createElement('span');
    dates.className = 'week-dates';

    dates.textContent =
        `${formatWeekDate(week.week_start)} - ` +
        `${formatWeekDate(week.week_end)}`;



    weekRow.append(
        heading,
        dates
    );

    return weekRow;
}


/*
 * Create one month column and populate it with its visible weeks.
 */
function createMonthCard(group) {
    const article = document.createElement('article');
    article.className = 'month-card';


    const heading = document.createElement('h3');

    heading.textContent =
        getMonthHeading(
            group.year,
            group.month
        );


    const weekList = document.createElement('div');
    weekList.className = 'week-list';


    for (const week of group.weeks) {
        const weekRow = createWeekRow(week);

        if (weekRow) {
            weekList.appendChild(weekRow);
        }
    }


    article.append(
        heading,
        weekList
    );

    return article;
}


/*
 * Replace the current availability display with the rows
 * returned by the API.
 */
function renderAvailability(rows) {
    availabilityGrid.replaceChildren();

    const groups = groupByDisplayMonth(rows);

    for (const group of groups) {
        availabilityGrid.appendChild(
            createMonthCard(group)
        );
    }
}


/*
 * Request the initial availability window from the API.
 */
async function loadAvailability(anchor) {

    const params = new URLSearchParams({
        personnel: PERSONNEL_CODE,
        activity: ACTIVITY_TYPE,
        anchor: anchor
    });

    const response = await fetch(
        `/api/availability?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error(
            `Availability request failed: ${response.status}`
        );
    }

    const rows = await response.json();

    currentRows = rows;

    if (
        initialDisplayYear === null &&
        initialDisplayMonth === null &&
        rows.length > 0
    ) {
        const initialPeriod =
            getFirstDisplayPeriod(rows);

        initialDisplayYear =
            initialPeriod.year;

        initialDisplayMonth =
            initialPeriod.month;
    }

    renderAvailability(rows);
    updatePreviousButton();

    nextButton.disabled =
        !hasFullDisplayWindow(currentRows);

}

/*
 * Advance the display window by one Thursday-owned month.
 */
nextButton.addEventListener('click', () => {
    if (
        nextButton.disabled ||
        currentRows.length === 0
    ) {
        return;
    }
    const firstPeriod =
        getFirstDisplayPeriod(currentRows);

    const firstMonthRows =
        currentRows.filter(row =>
            row.iso_year === firstPeriod.year &&
            row.display_month === firstPeriod.month
        );

    const lastWeekOfFirstMonth =
        firstMonthRows[firstMonthRows.length - 1];

    const nextAnchor =
        addDays(
            lastWeekOfFirstMonth.week_end,
            1
        );

    loadAvailability(nextAnchor).catch((err) => {
        console.error(
            'Unable to load next availability window:',
            err
        );
    });
});

/*
 * Return the display window to the preceding Thursday-owned month.
 */
previousButton.addEventListener('click', () => {
    if (
        previousButton.disabled ||
        currentRows.length === 0
    ) {
        return;
    }

    const firstWeek = currentRows[0];

    const previousAnchor =
        addDays(
            firstWeek.week_start,
            -1
        );

    loadAvailability(previousAnchor).catch((err) => {
        console.error(
            'Unable to load previous availability window:',
            err
        );
    });
});

/*
 * Initial page load.
 */
loadAvailability(getTodayAnchor()).catch((err) => {
    console.error(
        'Unable to load availability:',
        err
    );
});
