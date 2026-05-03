/**
 * Generate consultation slots at intervals EQUAL to service duration
 * This prevents slot overlap - each slot is independent
 * @param {string} startTime - Doctor availability start time (HH:MM format)
 * @param {string} endTime - Doctor availability end time (HH:MM format)
 * @param {number} duration - Service duration in minutes (ALSO used as interval to prevent overlaps)
 * @returns {Array} Array of time slots with duration
 * @throws {Error} If times are invalid or not in HH:MM format
 */
const generateTimeSlots = (startTime, endTime, duration = 30) => {
  const slots = [];
  
  // Validate inputs
  if (!startTime || !endTime) {
    throw new Error('Start time and end time are required');
  }

  if (!startTime.match(/^\d{2}:\d{2}$/) || !endTime.match(/^\d{2}:\d{2}$/)) {
    throw new Error('Times must be in HH:MM format');
  }

  if (!duration || duration <= 0) {
    throw new Error('Duration must be a positive number');
  }

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  // Validate hour and minute ranges
  if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59) {
    throw new Error('Start time has invalid hours or minutes');
  }

  if (endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59) {
    throw new Error('End time has invalid hours or minutes');
  }
  
  let currentHour = startHour;
  let currentMin = startMin;
  const endTotalMins = endHour * 60 + endMin;
  
  // Generate slots at intervals EQUAL to the service duration
  // This prevents overlaps - a 45min service generates slots 45 mins apart
  // A 30min service generates slots 30 mins apart, etc.
  while (currentHour * 60 + currentMin + duration <= endTotalMins) {
    const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    
    // Calculate end time based on SERVICE DURATION
    let endSlotHour = currentHour;
    let endSlotMin = currentMin + duration;
    
    if (endSlotMin >= 60) {
      endSlotHour += Math.floor(endSlotMin / 60);
      endSlotMin = endSlotMin % 60;
    }
    
    const slotEnd = `${String(endSlotHour).padStart(2, '0')}:${String(endSlotMin).padStart(2, '0')}`;
    
    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      duration,
    });
    
    // Move to next slot by DURATION amount (not fixed 30 mins)
    // This ensures no overlap: 45min service = slots 45 mins apart
    currentMin += duration;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }
  
  return slots;
};

module.exports = {
  generateTimeSlots,
};
