//CHECKSUM:6d82945a2b9cdbd4a859c26b583f3d69adb82e8bcf47860188742bfe96604b41
"use strict";

/**
 *
 * @title Sends serialized data to parent page on channel web
 * @category Channel Web
 * @author Botpress, Inc.
 * @param {string} data - Serialized payload you want to send
 */
const sendPostbackToParent = data => {
  if (event.channel != 'web') {
    return;
  }

  const postbackEvent = bp.IO.Event({
    type: 'postback',
    channel: 'web',
    direction: 'outgoing',
    target: event.target,
    botId: event.botId,
    payload: {
      data
    }
  });
  bp.events.sendEvent(postbackEvent);
};

return sendPostbackToParent(args.data);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNlbmRQb3N0YmFja1RvUGFyZW50LmpzIl0sIm5hbWVzIjpbInNlbmRQb3N0YmFja1RvUGFyZW50IiwiZGF0YSIsImV2ZW50IiwiY2hhbm5lbCIsInBvc3RiYWNrRXZlbnQiLCJicCIsIklPIiwiRXZlbnQiLCJ0eXBlIiwiZGlyZWN0aW9uIiwidGFyZ2V0IiwiYm90SWQiLCJwYXlsb2FkIiwiZXZlbnRzIiwic2VuZEV2ZW50IiwiYXJncyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7OztBQU9BLE1BQU1BLG9CQUFvQixHQUFHQyxJQUFJLElBQUk7QUFDbkMsTUFBSUMsS0FBSyxDQUFDQyxPQUFOLElBQWlCLEtBQXJCLEVBQTRCO0FBQzFCO0FBQ0Q7O0FBRUQsUUFBTUMsYUFBYSxHQUFHQyxFQUFFLENBQUNDLEVBQUgsQ0FBTUMsS0FBTixDQUFZO0FBQ2hDQyxJQUFBQSxJQUFJLEVBQUUsVUFEMEI7QUFFaENMLElBQUFBLE9BQU8sRUFBRSxLQUZ1QjtBQUdoQ00sSUFBQUEsU0FBUyxFQUFFLFVBSHFCO0FBSWhDQyxJQUFBQSxNQUFNLEVBQUVSLEtBQUssQ0FBQ1EsTUFKa0I7QUFLaENDLElBQUFBLEtBQUssRUFBRVQsS0FBSyxDQUFDUyxLQUxtQjtBQU1oQ0MsSUFBQUEsT0FBTyxFQUFFO0FBQ1BYLE1BQUFBO0FBRE87QUFOdUIsR0FBWixDQUF0QjtBQVdBSSxFQUFBQSxFQUFFLENBQUNRLE1BQUgsQ0FBVUMsU0FBVixDQUFvQlYsYUFBcEI7QUFDRCxDQWpCRDs7QUFtQkEsT0FBT0osb0JBQW9CLENBQUNlLElBQUksQ0FBQ2QsSUFBTixDQUEzQiIsInNvdXJjZVJvb3QiOiIvVm9sdW1lcy9icC9ib3RwcmVzcy9tb2R1bGVzL2NoYW5uZWwtd2ViL3NyYy9iYWNrZW5kIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICogQHRpdGxlIFNlbmRzIHNlcmlhbGl6ZWQgZGF0YSB0byBwYXJlbnQgcGFnZSBvbiBjaGFubmVsIHdlYlxuICogQGNhdGVnb3J5IENoYW5uZWwgV2ViXG4gKiBAYXV0aG9yIEJvdHByZXNzLCBJbmMuXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YSAtIFNlcmlhbGl6ZWQgcGF5bG9hZCB5b3Ugd2FudCB0byBzZW5kXG4gKi9cbmNvbnN0IHNlbmRQb3N0YmFja1RvUGFyZW50ID0gZGF0YSA9PiB7XG4gIGlmIChldmVudC5jaGFubmVsICE9ICd3ZWInKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBjb25zdCBwb3N0YmFja0V2ZW50ID0gYnAuSU8uRXZlbnQoe1xuICAgIHR5cGU6ICdwb3N0YmFjaycsXG4gICAgY2hhbm5lbDogJ3dlYicsXG4gICAgZGlyZWN0aW9uOiAnb3V0Z29pbmcnLFxuICAgIHRhcmdldDogZXZlbnQudGFyZ2V0LFxuICAgIGJvdElkOiBldmVudC5ib3RJZCxcbiAgICBwYXlsb2FkOiB7XG4gICAgICBkYXRhXG4gICAgfVxuICB9KVxuXG4gIGJwLmV2ZW50cy5zZW5kRXZlbnQocG9zdGJhY2tFdmVudClcbn1cblxucmV0dXJuIHNlbmRQb3N0YmFja1RvUGFyZW50KGFyZ3MuZGF0YSlcbiJdfQ==