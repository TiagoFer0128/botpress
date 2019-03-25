//CHECKSUM:e50edacaf94fd33b4102e15886faae820b6498779eb6082073a4b6f8579bf215
'use strict';

const _ = require('lodash');

const INTENT_PREFIX = 'intent:';
/**
 * Get a variable under this user's storage
 * @title Validate user choice
 * @category Skills
 * @hidden true
 * @author Botpress, Inc.
 * @param {string} data - The parameters of the available choices
 */

const validateChoice = async data => {
  let choice = undefined;
  const config = await bp.config.getModuleConfigForBot('basic-skills', event.botId);

  const nb = _.get(event.preview.match(/^[#).!]?([\d]{1,2})[#).!]?$/), '[1]');

  if (config.matchNumbers && nb) {
    const index = parseInt(nb) - 1;
    const element = await bp.cms.getContentElement(event.botId, data.contentId);
    choice = _.get(element, `formData.choices.${index}.value`);
  }

  if (!choice && config.matchNLU) {
    choice = _.findKey(data.keywords, keywords => {
      const intents = keywords.filter(x => x.toLowerCase().startsWith(INTENT_PREFIX)).map(x => x.substr(INTENT_PREFIX.length));
      return _.some(intents, k => event.nlu.intent.name === k);
    });
  }

  if (!choice) {
    choice = _.findKey(data.keywords, keywords => _.some(keywords || [], k => _.includes(event.preview.toLowerCase(), k.toLowerCase()) || event.payload && _.includes(_.get(event, 'payload.text', '').toLowerCase(), k.toLowerCase())));
  }

  if (choice) {
    temp['skill-choice-valid'] = true;
    temp['skill-choice-ret'] = choice;
  } else {
    temp['skill-choice-valid'] = false;
  }
};

return validateChoice(args);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNob2ljZV9wYXJzZV9hbnN3ZXIuanMiXSwibmFtZXMiOlsiXyIsInJlcXVpcmUiLCJJTlRFTlRfUFJFRklYIiwidmFsaWRhdGVDaG9pY2UiLCJkYXRhIiwiY2hvaWNlIiwidW5kZWZpbmVkIiwiY29uZmlnIiwiYnAiLCJnZXRNb2R1bGVDb25maWdGb3JCb3QiLCJldmVudCIsImJvdElkIiwibmIiLCJnZXQiLCJwcmV2aWV3IiwibWF0Y2giLCJtYXRjaE51bWJlcnMiLCJpbmRleCIsInBhcnNlSW50IiwiZWxlbWVudCIsImNtcyIsImdldENvbnRlbnRFbGVtZW50IiwiY29udGVudElkIiwibWF0Y2hOTFUiLCJmaW5kS2V5Iiwia2V5d29yZHMiLCJpbnRlbnRzIiwiZmlsdGVyIiwieCIsInRvTG93ZXJDYXNlIiwic3RhcnRzV2l0aCIsIm1hcCIsInN1YnN0ciIsImxlbmd0aCIsInNvbWUiLCJrIiwibmx1IiwiaW50ZW50IiwibmFtZSIsImluY2x1ZGVzIiwicGF5bG9hZCIsInRlbXAiLCJhcmdzIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQSxNQUFNQSxDQUFDLEdBQUdDLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUNBLE1BQU1DLGFBQWEsR0FBRyxTQUF0QjtBQUVBOzs7Ozs7Ozs7QUFRQSxNQUFNQyxjQUFjLEdBQUcsTUFBTUMsSUFBTixJQUFjO0FBQ25DLE1BQUlDLE1BQU0sR0FBR0MsU0FBYjtBQUNBLFFBQU1DLE1BQU0sR0FBRyxNQUFNQyxFQUFFLENBQUNELE1BQUgsQ0FBVUUscUJBQVYsQ0FBZ0MsY0FBaEMsRUFBZ0RDLEtBQUssQ0FBQ0MsS0FBdEQsQ0FBckI7O0FBQ0EsUUFBTUMsRUFBRSxHQUFHWixDQUFDLENBQUNhLEdBQUYsQ0FBTUgsS0FBSyxDQUFDSSxPQUFOLENBQWNDLEtBQWQsQ0FBb0IsNkJBQXBCLENBQU4sRUFBMEQsS0FBMUQsQ0FBWDs7QUFFQSxNQUFJUixNQUFNLENBQUNTLFlBQVAsSUFBdUJKLEVBQTNCLEVBQStCO0FBQzdCLFVBQU1LLEtBQUssR0FBR0MsUUFBUSxDQUFDTixFQUFELENBQVIsR0FBZSxDQUE3QjtBQUNBLFVBQU1PLE9BQU8sR0FBRyxNQUFNWCxFQUFFLENBQUNZLEdBQUgsQ0FBT0MsaUJBQVAsQ0FBeUJYLEtBQUssQ0FBQ0MsS0FBL0IsRUFBc0NQLElBQUksQ0FBQ2tCLFNBQTNDLENBQXRCO0FBQ0FqQixJQUFBQSxNQUFNLEdBQUdMLENBQUMsQ0FBQ2EsR0FBRixDQUFNTSxPQUFOLEVBQWdCLG9CQUFtQkYsS0FBTSxRQUF6QyxDQUFUO0FBQ0Q7O0FBRUQsTUFBSSxDQUFDWixNQUFELElBQVdFLE1BQU0sQ0FBQ2dCLFFBQXRCLEVBQWdDO0FBQzlCbEIsSUFBQUEsTUFBTSxHQUFHTCxDQUFDLENBQUN3QixPQUFGLENBQVVwQixJQUFJLENBQUNxQixRQUFmLEVBQXlCQSxRQUFRLElBQUk7QUFDNUMsWUFBTUMsT0FBTyxHQUFHRCxRQUFRLENBQ3JCRSxNQURhLENBQ05DLENBQUMsSUFBSUEsQ0FBQyxDQUFDQyxXQUFGLEdBQWdCQyxVQUFoQixDQUEyQjVCLGFBQTNCLENBREMsRUFFYjZCLEdBRmEsQ0FFVEgsQ0FBQyxJQUFJQSxDQUFDLENBQUNJLE1BQUYsQ0FBUzlCLGFBQWEsQ0FBQytCLE1BQXZCLENBRkksQ0FBaEI7QUFHQSxhQUFPakMsQ0FBQyxDQUFDa0MsSUFBRixDQUFPUixPQUFQLEVBQWdCUyxDQUFDLElBQUl6QixLQUFLLENBQUMwQixHQUFOLENBQVVDLE1BQVYsQ0FBaUJDLElBQWpCLEtBQTBCSCxDQUEvQyxDQUFQO0FBQ0QsS0FMUSxDQUFUO0FBTUQ7O0FBRUQsTUFBSSxDQUFDOUIsTUFBTCxFQUFhO0FBQ1hBLElBQUFBLE1BQU0sR0FBR0wsQ0FBQyxDQUFDd0IsT0FBRixDQUFVcEIsSUFBSSxDQUFDcUIsUUFBZixFQUF5QkEsUUFBUSxJQUN4Q3pCLENBQUMsQ0FBQ2tDLElBQUYsQ0FDRVQsUUFBUSxJQUFJLEVBRGQsRUFFRVUsQ0FBQyxJQUNDbkMsQ0FBQyxDQUFDdUMsUUFBRixDQUFXN0IsS0FBSyxDQUFDSSxPQUFOLENBQWNlLFdBQWQsRUFBWCxFQUF3Q00sQ0FBQyxDQUFDTixXQUFGLEVBQXhDLEtBQ0NuQixLQUFLLENBQUM4QixPQUFOLElBQWlCeEMsQ0FBQyxDQUFDdUMsUUFBRixDQUFXdkMsQ0FBQyxDQUFDYSxHQUFGLENBQU1ILEtBQU4sRUFBYSxjQUFiLEVBQTZCLEVBQTdCLEVBQWlDbUIsV0FBakMsRUFBWCxFQUEyRE0sQ0FBQyxDQUFDTixXQUFGLEVBQTNELENBSnRCLENBRE8sQ0FBVDtBQVFEOztBQUVELE1BQUl4QixNQUFKLEVBQVk7QUFDVm9DLElBQUFBLElBQUksQ0FBQyxvQkFBRCxDQUFKLEdBQTZCLElBQTdCO0FBQ0FBLElBQUFBLElBQUksQ0FBQyxrQkFBRCxDQUFKLEdBQTJCcEMsTUFBM0I7QUFDRCxHQUhELE1BR087QUFDTG9DLElBQUFBLElBQUksQ0FBQyxvQkFBRCxDQUFKLEdBQTZCLEtBQTdCO0FBQ0Q7QUFDRixDQXJDRDs7QUF1Q0EsT0FBT3RDLGNBQWMsQ0FBQ3VDLElBQUQsQ0FBckIiLCJzb3VyY2VSb290IjoiL1ZvbHVtZXMvYnAvYm90cHJlc3MvbW9kdWxlcy9iYXNpYy1za2lsbHMvc3JjL2JhY2tlbmQiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKVxuY29uc3QgSU5URU5UX1BSRUZJWCA9ICdpbnRlbnQ6J1xuXG4vKipcbiAqIEdldCBhIHZhcmlhYmxlIHVuZGVyIHRoaXMgdXNlcidzIHN0b3JhZ2VcbiAqIEB0aXRsZSBWYWxpZGF0ZSB1c2VyIGNob2ljZVxuICogQGNhdGVnb3J5IFNraWxsc1xuICogQGhpZGRlbiB0cnVlXG4gKiBAYXV0aG9yIEJvdHByZXNzLCBJbmMuXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YSAtIFRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBhdmFpbGFibGUgY2hvaWNlc1xuICovXG5jb25zdCB2YWxpZGF0ZUNob2ljZSA9IGFzeW5jIGRhdGEgPT4ge1xuICBsZXQgY2hvaWNlID0gdW5kZWZpbmVkXG4gIGNvbnN0IGNvbmZpZyA9IGF3YWl0IGJwLmNvbmZpZy5nZXRNb2R1bGVDb25maWdGb3JCb3QoJ2Jhc2ljLXNraWxscycsIGV2ZW50LmJvdElkKVxuICBjb25zdCBuYiA9IF8uZ2V0KGV2ZW50LnByZXZpZXcubWF0Y2goL15bIykuIV0/KFtcXGRdezEsMn0pWyMpLiFdPyQvKSwgJ1sxXScpXG5cbiAgaWYgKGNvbmZpZy5tYXRjaE51bWJlcnMgJiYgbmIpIHtcbiAgICBjb25zdCBpbmRleCA9IHBhcnNlSW50KG5iKSAtIDFcbiAgICBjb25zdCBlbGVtZW50ID0gYXdhaXQgYnAuY21zLmdldENvbnRlbnRFbGVtZW50KGV2ZW50LmJvdElkLCBkYXRhLmNvbnRlbnRJZClcbiAgICBjaG9pY2UgPSBfLmdldChlbGVtZW50LCBgZm9ybURhdGEuY2hvaWNlcy4ke2luZGV4fS52YWx1ZWApXG4gIH1cblxuICBpZiAoIWNob2ljZSAmJiBjb25maWcubWF0Y2hOTFUpIHtcbiAgICBjaG9pY2UgPSBfLmZpbmRLZXkoZGF0YS5rZXl3b3Jkcywga2V5d29yZHMgPT4ge1xuICAgICAgY29uc3QgaW50ZW50cyA9IGtleXdvcmRzXG4gICAgICAgIC5maWx0ZXIoeCA9PiB4LnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aChJTlRFTlRfUFJFRklYKSlcbiAgICAgICAgLm1hcCh4ID0+IHguc3Vic3RyKElOVEVOVF9QUkVGSVgubGVuZ3RoKSlcbiAgICAgIHJldHVybiBfLnNvbWUoaW50ZW50cywgayA9PiBldmVudC5ubHUuaW50ZW50Lm5hbWUgPT09IGspXG4gICAgfSlcbiAgfVxuXG4gIGlmICghY2hvaWNlKSB7XG4gICAgY2hvaWNlID0gXy5maW5kS2V5KGRhdGEua2V5d29yZHMsIGtleXdvcmRzID0+XG4gICAgICBfLnNvbWUoXG4gICAgICAgIGtleXdvcmRzIHx8IFtdLFxuICAgICAgICBrID0+XG4gICAgICAgICAgXy5pbmNsdWRlcyhldmVudC5wcmV2aWV3LnRvTG93ZXJDYXNlKCksIGsudG9Mb3dlckNhc2UoKSkgfHxcbiAgICAgICAgICAoZXZlbnQucGF5bG9hZCAmJiBfLmluY2x1ZGVzKF8uZ2V0KGV2ZW50LCAncGF5bG9hZC50ZXh0JywgJycpLnRvTG93ZXJDYXNlKCksIGsudG9Mb3dlckNhc2UoKSkpXG4gICAgICApXG4gICAgKVxuICB9XG5cbiAgaWYgKGNob2ljZSkge1xuICAgIHRlbXBbJ3NraWxsLWNob2ljZS12YWxpZCddID0gdHJ1ZVxuICAgIHRlbXBbJ3NraWxsLWNob2ljZS1yZXQnXSA9IGNob2ljZVxuICB9IGVsc2Uge1xuICAgIHRlbXBbJ3NraWxsLWNob2ljZS12YWxpZCddID0gZmFsc2VcbiAgfVxufVxuXG5yZXR1cm4gdmFsaWRhdGVDaG9pY2UoYXJncylcbiJdfQ==