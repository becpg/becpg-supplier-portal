/**
 * The supplier's due dates, grouped by week: open tasks to hand in and
 * documents reaching the end of their validity.
 *
 * Pure: no request, no clock read. The dashboard computes it on the server
 * from what it already holds and the chart only draws it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Weeks drawn after the current one is included. */
export const SCHEDULE_WEEKS = 8;

/**
 * Midnight UTC of the Monday of the week holding `date`.
 *
 * @param {Date} date
 * @returns {Date}
 */
function mondayOf(date) {
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const offset = (day.getUTCDay() + 6) % 7;
    return new Date(day.getTime() - offset * DAY_MS);
}

/** The time of an ISO date, or `null` when it is absent or unreadable. */
function timeOf(value) {
    const time = value ? Date.parse(value) : NaN;
    return Number.isNaN(time) ? null : time;
}

/**
 * Index of the bucket a date falls in: -1 before the current week, the week
 * number from 0, or `weeks` for everything later.
 */
function bucketOf(time, start, weeks) {
    if (time < start) {
        return -1;
    }
    return Math.min(Math.floor((time - start) / (7 * DAY_MS)), weeks);
}

/**
 * @param {Object} input
 * @param {Array<{dueDate?: string}>} input.tasks open tasks
 * @param {Array<string>} input.expiries end-of-validity dates of the documents
 * @param {Date} input.now
 * @param {number} [input.weeks=SCHEDULE_WEEKS]
 * @returns {{
 *   overdue: {tasks: number, documents: number},
 *   weeks: Array<{start: string, tasks: number, documents: number}>,
 *   later: {tasks: number, documents: number},
 *   undatedTasks: number,
 * }} `overdue` holds what fell due before the current week; `weeks[0]` is the
 *    current week, each `start` its Monday as `YYYY-MM-DD`
 */
export function buildSchedule({ tasks, expiries, now, weeks = SCHEDULE_WEEKS }) {
    const start = mondayOf(now).getTime();
    const overdue = { tasks: 0, documents: 0 };
    const later = { tasks: 0, documents: 0 };
    const slots = Array.from({ length: weeks }, (_, index) => ({
        start: new Date(start + index * 7 * DAY_MS).toISOString().slice(0, 10),
        tasks: 0,
        documents: 0,
    }));
    const place = (time, key) => {
        const bucket = bucketOf(time, start, weeks);
        const target = bucket < 0 ? overdue : bucket >= weeks ? later : slots[bucket];
        target[key] += 1;
    };
    let undatedTasks = 0;
    for (const task of tasks) {
        const time = timeOf(task.dueDate);
        if (time === null) {
            undatedTasks += 1;
        }
        else {
            place(time, 'tasks');
        }
    }
    for (const expiry of expiries) {
        const time = timeOf(expiry);
        if (time !== null) {
            place(time, 'documents');
        }
    }
    return { overdue, weeks: slots, later, undatedTasks };
}
