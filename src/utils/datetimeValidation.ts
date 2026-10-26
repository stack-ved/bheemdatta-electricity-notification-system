/**
 * Datetime validation and local browser formatting utility for NEA Electricity Outage application.
 *
 * Requirements:
 * 1. Uses local browser timezone (Nepal Time / local device time).
 * 2. Does NOT use UTC toISOString() which introduces timezone skew in datetime-local inputs.
 * 3. Enforces dynamic HTML min values.
 * 4. JavaScript validation prevents past start dates, past expected end dates, and end < start.
 * 5. Handles create vs edit (preserves historical start times on edit).
 * 6. Validates actual_end_time >= start_time.
 */

/**
 * Formats a Date object as a YYYY-MM-DDTHH:mm string matching the local browser timezone.
 */
export function toLocalDatetimeInputString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parses a datetime string (datetime-local or ISO) into a local Date object.
 */
export function parseLocalDatetimeInput(value?: string | null): Date | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const [datePart, timePart] = trimmed.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
      return null;
    }
    return new Date(year, month - 1, day, hours, minutes, seconds || 0);
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export interface OutageDateTimeValidationOptions {
  isEdit?: boolean;
  requireExpectedEndTime?: boolean;
}

export interface OutageValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates outage start time, expected solve time, and actual solve time.
 */
export function validateOutageDates(
  startTimeStr?: string | null,
  expectedEndTimeStr?: string | null,
  actualEndTimeStr?: string | null,
  options: OutageDateTimeValidationOptions = {}
): OutageValidationResult {
  const requireEnd = options.requireExpectedEndTime !== false;

  if (requireEnd && (!startTimeStr?.trim() || !expectedEndTimeStr?.trim())) {
    return {
      isValid: false,
      error: 'Please select both the outage start time and expected solve time.',
    };
  }

  if (!startTimeStr || !startTimeStr.trim()) {
    return { isValid: false, error: 'Please select the outage start time.' };
  }

  const startDate = parseLocalDatetimeInput(startTimeStr);
  if (!startDate) {
    return { isValid: false, error: 'Invalid outage start time format.' };
  }

  const now = new Date();
  // 60-second grace buffer to account for the seconds elapsed while filling out the form
  const nowWithGrace = new Date(now.getTime() - 60000);

  // RULE 1: When creating a NEW outage, start time must NOT be earlier than current time.
  if (!options.isEdit) {
    if (startDate < nowWithGrace) {
      return { isValid: false, error: 'Outage start time cannot be in the past.' };
    }
  }

  // RULE 2: Expected Solve / End Date/Time
  if (expectedEndTimeStr && expectedEndTimeStr.trim()) {
    const endDate = parseLocalDatetimeInput(expectedEndTimeStr);
    if (!endDate) {
      return { isValid: false, error: 'Invalid expected solve time format.' };
    }

    // Expected solve time cannot be in the past for new notices
    if (!options.isEdit && endDate < nowWithGrace) {
      return { isValid: false, error: 'Expected solve time cannot be in the past.' };
    }

    // Expected solve time must be after or equal to start time
    if (endDate < startDate) {
      return { isValid: false, error: 'Expected solve time must be after the outage start time.' };
    }
  }

  // RULE 3: Actual End Time (for solved/restored outages)
  if (actualEndTimeStr && actualEndTimeStr.trim()) {
    const actualDate = parseLocalDatetimeInput(actualEndTimeStr);
    if (!actualDate) {
      return { isValid: false, error: 'Invalid actual solve time format.' };
    }

    if (actualDate < startDate) {
      return { isValid: false, error: 'Actual solve time cannot be earlier than the outage start time.' };
    }

    // Actual solve time cannot be in the future when marking as resolved
    if (actualDate > new Date(now.getTime() + 60000)) {
      return { isValid: false, error: 'Actual solve time cannot be in the future.' };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Calculates dynamic minimum for expected end time input based on current local time and start time.
 * minimumEndDateTime = max(currentDateTime, selectedStartDateTime)
 */
export function getMinimumEndDatetime(selectedStartTime?: string | null): string {
  const now = new Date();
  const currentLocal = toLocalDatetimeInputString(now);

  if (!selectedStartTime || !selectedStartTime.trim()) {
    return currentLocal;
  }

  const parsedStart = parseLocalDatetimeInput(selectedStartTime);
  if (!parsedStart) return currentLocal;

  const maxDate = parsedStart > now ? parsedStart : now;
  return toLocalDatetimeInputString(maxDate);
}
