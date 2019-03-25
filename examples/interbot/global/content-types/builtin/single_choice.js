//CHECKSUM:4378522bc04572ac6b5378307140a1607ef046bd0568330494bc93e5c6a402fb
"use strict";

const base = require('./_base');

function render(data) {
  const events = [];

  if (data.typing) {
    events.push({
      type: 'typing',
      value: data.typing
    });
  }

  return [...events, {
    on: 'webchat',
    text: data.text,
    quick_replies: data.choices.map(c => ({
      title: c.title,
      payload: c.value.toUpperCase()
    })),
    typing: data.typing
  }];
}

function renderMessenger(data) {
  return [{
    type: 'typing',
    value: data.typing
  }, {
    text: data.text,
    quick_replies: data.choices.map(c => ({
      content_type: 'text',
      title: c.title,
      payload: c.value.toUpperCase()
    }))
  }];
}

function renderElement(data, channel) {
  if (channel === 'web' || channel === 'api' || channel === 'telegram') {
    return render(data);
  } else if (channel === 'messenger') {
    return renderMessenger(data);
  }

  return []; // TODO Handle channel not supported
}

module.exports = {
  id: 'builtin_single-choice',
  group: 'Built-in Messages',
  title: 'Single Choice',
  jsonSchema: {
    description: 'Suggest choices to the user with the intention of picking only one (with an optional message)',
    type: 'object',
    required: ['choices'],
    properties: {
      text: {
        type: 'string',
        title: 'Message'
      },
      choices: {
        type: 'array',
        title: 'Choices',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          required: ['title', 'value'],
          properties: {
            title: {
              description: 'The title of the choice (this is what gets shown to the user)',
              type: 'string',
              title: 'Message'
            },
            value: {
              description: 'The value that your bot gets when the user picks this choice (usually hidden from the user)',
              type: 'string',
              title: 'Value'
            }
          }
        }
      },
      ...base.typingIndicators
    }
  },
  uiSchema: {
    variations: {
      'ui:options': {
        orderable: false
      }
    }
  },
  computePreviewText: formData => `Choices (${formData.choices.length}) ${formData.text}`,
  renderElement: renderElement,
  hidden: true
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNpbmdsZV9jaG9pY2UuanMiXSwibmFtZXMiOlsiYmFzZSIsInJlcXVpcmUiLCJyZW5kZXIiLCJkYXRhIiwiZXZlbnRzIiwidHlwaW5nIiwicHVzaCIsInR5cGUiLCJ2YWx1ZSIsIm9uIiwidGV4dCIsInF1aWNrX3JlcGxpZXMiLCJjaG9pY2VzIiwibWFwIiwiYyIsInRpdGxlIiwicGF5bG9hZCIsInRvVXBwZXJDYXNlIiwicmVuZGVyTWVzc2VuZ2VyIiwiY29udGVudF90eXBlIiwicmVuZGVyRWxlbWVudCIsImNoYW5uZWwiLCJtb2R1bGUiLCJleHBvcnRzIiwiaWQiLCJncm91cCIsImpzb25TY2hlbWEiLCJkZXNjcmlwdGlvbiIsInJlcXVpcmVkIiwicHJvcGVydGllcyIsIm1pbkl0ZW1zIiwibWF4SXRlbXMiLCJpdGVtcyIsInR5cGluZ0luZGljYXRvcnMiLCJ1aVNjaGVtYSIsInZhcmlhdGlvbnMiLCJvcmRlcmFibGUiLCJjb21wdXRlUHJldmlld1RleHQiLCJmb3JtRGF0YSIsImxlbmd0aCIsImhpZGRlbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxNQUFNQSxJQUFJLEdBQUdDLE9BQU8sQ0FBQyxTQUFELENBQXBCOztBQUVBLFNBQVNDLE1BQVQsQ0FBZ0JDLElBQWhCLEVBQXNCO0FBQ3BCLFFBQU1DLE1BQU0sR0FBRyxFQUFmOztBQUVBLE1BQUlELElBQUksQ0FBQ0UsTUFBVCxFQUFpQjtBQUNmRCxJQUFBQSxNQUFNLENBQUNFLElBQVAsQ0FBWTtBQUNWQyxNQUFBQSxJQUFJLEVBQUUsUUFESTtBQUVWQyxNQUFBQSxLQUFLLEVBQUVMLElBQUksQ0FBQ0U7QUFGRixLQUFaO0FBSUQ7O0FBRUQsU0FBTyxDQUNMLEdBQUdELE1BREUsRUFFTDtBQUNFSyxJQUFBQSxFQUFFLEVBQUUsU0FETjtBQUVFQyxJQUFBQSxJQUFJLEVBQUVQLElBQUksQ0FBQ08sSUFGYjtBQUdFQyxJQUFBQSxhQUFhLEVBQUVSLElBQUksQ0FBQ1MsT0FBTCxDQUFhQyxHQUFiLENBQWlC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O0FBREosR0F6Q0s7QUFpRGZDLEVBQUFBLGtCQUFrQixFQUFFQyxRQUFRLElBQUssWUFBV0EsUUFBUSxDQUFDMUIsT0FBVCxDQUFpQjJCLE1BQU8sS0FBSUQsUUFBUSxDQUFDNUIsSUFBSyxFQWpEdkU7QUFrRGZVLEVBQUFBLGFBQWEsRUFBRUEsYUFsREE7QUFtRGZvQixFQUFBQSxNQUFNLEVBQUU7QUFuRE8sQ0FBakIiLCJzb3VyY2VSb290IjoiL1ZvbHVtZXMvYnAvYm90cHJlc3MvbW9kdWxlcy9idWlsdGluL3NyYy9iYWNrZW5kIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgYmFzZSA9IHJlcXVpcmUoJy4vX2Jhc2UnKVxuXG5mdW5jdGlvbiByZW5kZXIoZGF0YSkge1xuICBjb25zdCBldmVudHMgPSBbXVxuXG4gIGlmIChkYXRhLnR5cGluZykge1xuICAgIGV2ZW50cy5wdXNoKHtcbiAgICAgIHR5cGU6ICd0eXBpbmcnLFxuICAgICAgdmFsdWU6IGRhdGEudHlwaW5nXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiBbXG4gICAgLi4uZXZlbnRzLFxuICAgIHtcbiAgICAgIG9uOiAnd2ViY2hhdCcsXG4gICAgICB0ZXh0OiBkYXRhLnRleHQsXG4gICAgICBxdWlja19yZXBsaWVzOiBkYXRhLmNob2ljZXMubWFwKGMgPT4gKHtcbiAgICAgICAgdGl0bGU6IGMudGl0bGUsXG4gICAgICAgIHBheWxvYWQ6IGMudmFsdWUudG9VcHBlckNhc2UoKVxuICAgICAgfSkpLFxuICAgICAgdHlwaW5nOiBkYXRhLnR5cGluZ1xuICAgIH1cbiAgXVxufVxuXG5mdW5jdGlvbiByZW5kZXJNZXNzZW5nZXIoZGF0YSkge1xuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIHR5cGU6ICd0eXBpbmcnLFxuICAgICAgdmFsdWU6IGRhdGEudHlwaW5nXG4gICAgfSxcbiAgICB7XG4gICAgICB0ZXh0OiBkYXRhLnRleHQsXG4gICAgICBxdWlja19yZXBsaWVzOiBkYXRhLmNob2ljZXMubWFwKGMgPT4gKHtcbiAgICAgICAgY29udGVudF90eXBlOiAndGV4dCcsXG4gICAgICAgIHRpdGxlOiBjLnRpdGxlLFxuICAgICAgICBwYXlsb2FkOiBjLnZhbHVlLnRvVXBwZXJDYXNlKClcbiAgICAgIH0pKVxuICAgIH1cbiAgXVxufVxuXG5mdW5jdGlvbiByZW5kZXJFbGVtZW50KGRhdGEsIGNoYW5uZWwpIHtcbiAgaWYgKGNoYW5uZWwgPT09ICd3ZWInIHx8IGNoYW5uZWwgPT09ICdhcGknIHx8IGNoYW5uZWwgPT09ICd0ZWxlZ3JhbScpIHtcbiAgICByZXR1cm4gcmVuZGVyKGRhdGEpXG4gIH0gZWxzZSBpZiAoY2hhbm5lbCA9PT0gJ21lc3NlbmdlcicpIHtcbiAgICByZXR1cm4gcmVuZGVyTWVzc2VuZ2VyKGRhdGEpXG4gIH1cblxuICByZXR1cm4gW10gLy8gVE9ETyBIYW5kbGUgY2hhbm5lbCBub3Qgc3VwcG9ydGVkXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpZDogJ2J1aWx0aW5fc2luZ2xlLWNob2ljZScsXG4gIGdyb3VwOiAnQnVpbHQtaW4gTWVzc2FnZXMnLFxuICB0aXRsZTogJ1NpbmdsZSBDaG9pY2UnLFxuXG4gIGpzb25TY2hlbWE6IHtcbiAgICBkZXNjcmlwdGlvbjogJ1N1Z2dlc3QgY2hvaWNlcyB0byB0aGUgdXNlciB3aXRoIHRoZSBpbnRlbnRpb24gb2YgcGlja2luZyBvbmx5IG9uZSAod2l0aCBhbiBvcHRpb25hbCBtZXNzYWdlKScsXG4gICAgdHlwZTogJ29iamVjdCcsXG4gICAgcmVxdWlyZWQ6IFsnY2hvaWNlcyddLFxuICAgIHByb3BlcnRpZXM6IHtcbiAgICAgIHRleHQ6IHtcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIHRpdGxlOiAnTWVzc2FnZSdcbiAgICAgIH0sXG4gICAgICBjaG9pY2VzOiB7XG4gICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgIHRpdGxlOiAnQ2hvaWNlcycsXG4gICAgICAgIG1pbkl0ZW1zOiAxLFxuICAgICAgICBtYXhJdGVtczogMTAsXG4gICAgICAgIGl0ZW1zOiB7XG4gICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgcmVxdWlyZWQ6IFsndGl0bGUnLCAndmFsdWUnXSxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSB0aXRsZSBvZiB0aGUgY2hvaWNlICh0aGlzIGlzIHdoYXQgZ2V0cyBzaG93biB0byB0aGUgdXNlciknLFxuICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgdGl0bGU6ICdNZXNzYWdlJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICdUaGUgdmFsdWUgdGhhdCB5b3VyIGJvdCBnZXRzIHdoZW4gdGhlIHVzZXIgcGlja3MgdGhpcyBjaG9pY2UgKHVzdWFsbHkgaGlkZGVuIGZyb20gdGhlIHVzZXIpJyxcbiAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgIHRpdGxlOiAnVmFsdWUnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLi4uYmFzZS50eXBpbmdJbmRpY2F0b3JzXG4gICAgfVxuICB9LFxuXG4gIHVpU2NoZW1hOiB7XG4gICAgdmFyaWF0aW9uczoge1xuICAgICAgJ3VpOm9wdGlvbnMnOiB7XG4gICAgICAgIG9yZGVyYWJsZTogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgY29tcHV0ZVByZXZpZXdUZXh0OiBmb3JtRGF0YSA9PiBgQ2hvaWNlcyAoJHtmb3JtRGF0YS5jaG9pY2VzLmxlbmd0aH0pICR7Zm9ybURhdGEudGV4dH1gLFxuICByZW5kZXJFbGVtZW50OiByZW5kZXJFbGVtZW50LFxuICBoaWRkZW46IHRydWVcbn1cbiJdfQ==