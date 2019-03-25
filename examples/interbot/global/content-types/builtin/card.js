//CHECKSUM:9b391bc093abe1739572d246eb1c4da476a84972235ef89e8fc6fbff4ce8bc3b
"use strict";

const ActionButton = require('./action_button');

const Carousel = require('./carousel');

module.exports = {
  id: 'builtin_card',
  group: 'Built-in Messages',
  title: 'Card',
  jsonSchema: {
    description: 'A card message with a title with optional subtitle, image and action buttons.',
    type: 'object',
    required: ['title'],
    properties: {
      title: {
        type: 'string',
        title: 'Title'
      },
      subtitle: {
        type: 'string',
        title: 'Subtitle'
      },
      image: {
        type: 'string',
        $subtype: 'media',
        $filter: '.jpg, .png, .jpeg, .gif, .bmp, .tif, .tiff|image/*',
        title: 'Image'
      },
      actions: {
        type: 'array',
        title: 'Action Buttons',
        items: ActionButton.jsonSchema
      }
    }
  },
  uiSchema: {
    title: {
      'ui:widget': 'textarea'
    },
    subtitle: {
      'ui:widget': 'textarea'
    }
  },
  computePreviewText: formData => `Card: ${formData.title}`,
  renderElement: (data, channel) => Carousel.renderElement({
    items: [data],
    ...data
  }, channel)
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhcmQuanMiXSwibmFtZXMiOlsiQWN0aW9uQnV0dG9uIiwicmVxdWlyZSIsIkNhcm91c2VsIiwibW9kdWxlIiwiZXhwb3J0cyIsImlkIiwiZ3JvdXAiLCJ0aXRsZSIsImpzb25TY2hlbWEiLCJkZXNjcmlwdGlvbiIsInR5cGUiLCJyZXF1aXJlZCIsInByb3BlcnRpZXMiLCJzdWJ0aXRsZSIsImltYWdlIiwiJHN1YnR5cGUiLCIkZmlsdGVyIiwiYWN0aW9ucyIsIml0ZW1zIiwidWlTY2hlbWEiLCJjb21wdXRlUHJldmlld1RleHQiLCJmb3JtRGF0YSIsInJlbmRlckVsZW1lbnQiLCJkYXRhIiwiY2hhbm5lbCJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxNQUFNQSxZQUFZLEdBQUdDLE9BQU8sQ0FBQyxpQkFBRCxDQUE1Qjs7QUFDQSxNQUFNQyxRQUFRLEdBQUdELE9BQU8sQ0FBQyxZQUFELENBQXhCOztBQUVBRSxNQUFNLENBQUNDLE9BQVAsR0FBaUI7QUFDZkMsRUFBQUEsRUFBRSxFQUFFLGNBRFc7QUFFZkMsRUFBQUEsS0FBSyxFQUFFLG1CQUZRO0FBR2ZDLEVBQUFBLEtBQUssRUFBRSxNQUhRO0FBS2ZDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxXQUFXLEVBQUUsK0VBREg7QUFFVkMsSUFBQUEsSUFBSSxFQUFFLFFBRkk7QUFHVkMsSUFBQUEsUUFBUSxFQUFFLENBQUMsT0FBRCxDQUhBO0FBSVZDLElBQUFBLFVBQVUsRUFBRTtBQUNWTCxNQUFBQSxLQUFLLEVBQUU7QUFDTEcsUUFBQUEsSUFBSSxFQUFFLFFBREQ7QUFFTEgsUUFBQUEsS0FBSyxFQUFFO0FBRkYsT0FERztBQUtWTSxNQUFBQSxRQUFRLEVBQUU7QUFDUkgsUUFBQUEsSUFBSSxFQUFFLFFBREU7QUFFUkgsUUFBQUEsS0FBSyxFQUFFO0FBRkMsT0FMQTtBQVNWTyxNQUFBQSxLQUFLLEVBQUU7QUFDTEosUUFBQUEsSUFBSSxFQUFFLFFBREQ7QUFFTEssUUFBQUEsUUFBUSxFQUFFLE9BRkw7QUFHTEMsUUFBQUEsT0FBTyxFQUFFLG9EQUhKO0FBSUxULFFBQUFBLEtBQUssRUFBRTtBQUpGLE9BVEc7QUFlVlUsTUFBQUEsT0FBTyxFQUFFO0FBQ1BQLFFBQUFBLElBQUksRUFBRSxPQURDO0FBRVBILFFBQUFBLEtBQUssRUFBRSxnQkFGQTtBQUdQVyxRQUFBQSxLQUFLLEVBQUVsQixZQUFZLENBQUNRO0FBSGI7QUFmQztBQUpGLEdBTEc7QUFnQ2ZXLEVBQUFBLFFBQVEsRUFBRTtBQUNSWixJQUFBQSxLQUFLLEVBQUU7QUFDTCxtQkFBYTtBQURSLEtBREM7QUFJUk0sSUFBQUEsUUFBUSxFQUFFO0FBQ1IsbUJBQWE7QUFETDtBQUpGLEdBaENLO0FBeUNmTyxFQUFBQSxrQkFBa0IsRUFBRUMsUUFBUSxJQUFLLFNBQVFBLFFBQVEsQ0FBQ2QsS0FBTSxFQXpDekM7QUEwQ2ZlLEVBQUFBLGFBQWEsRUFBRSxDQUFDQyxJQUFELEVBQU9DLE9BQVAsS0FBbUJ0QixRQUFRLENBQUNvQixhQUFULENBQXVCO0FBQUVKLElBQUFBLEtBQUssRUFBRSxDQUFDSyxJQUFELENBQVQ7QUFBaUIsT0FBR0E7QUFBcEIsR0FBdkIsRUFBbURDLE9BQW5EO0FBMUNuQixDQUFqQiIsInNvdXJjZVJvb3QiOiIvVm9sdW1lcy9icC9ib3RwcmVzcy9tb2R1bGVzL2J1aWx0aW4vc3JjL2JhY2tlbmQiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBBY3Rpb25CdXR0b24gPSByZXF1aXJlKCcuL2FjdGlvbl9idXR0b24nKVxuY29uc3QgQ2Fyb3VzZWwgPSByZXF1aXJlKCcuL2Nhcm91c2VsJylcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGlkOiAnYnVpbHRpbl9jYXJkJyxcbiAgZ3JvdXA6ICdCdWlsdC1pbiBNZXNzYWdlcycsXG4gIHRpdGxlOiAnQ2FyZCcsXG5cbiAganNvblNjaGVtYToge1xuICAgIGRlc2NyaXB0aW9uOiAnQSBjYXJkIG1lc3NhZ2Ugd2l0aCBhIHRpdGxlIHdpdGggb3B0aW9uYWwgc3VidGl0bGUsIGltYWdlIGFuZCBhY3Rpb24gYnV0dG9ucy4nLFxuICAgIHR5cGU6ICdvYmplY3QnLFxuICAgIHJlcXVpcmVkOiBbJ3RpdGxlJ10sXG4gICAgcHJvcGVydGllczoge1xuICAgICAgdGl0bGU6IHtcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIHRpdGxlOiAnVGl0bGUnXG4gICAgICB9LFxuICAgICAgc3VidGl0bGU6IHtcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIHRpdGxlOiAnU3VidGl0bGUnXG4gICAgICB9LFxuICAgICAgaW1hZ2U6IHtcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICRzdWJ0eXBlOiAnbWVkaWEnLFxuICAgICAgICAkZmlsdGVyOiAnLmpwZywgLnBuZywgLmpwZWcsIC5naWYsIC5ibXAsIC50aWYsIC50aWZmfGltYWdlLyonLFxuICAgICAgICB0aXRsZTogJ0ltYWdlJ1xuICAgICAgfSxcbiAgICAgIGFjdGlvbnM6IHtcbiAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgdGl0bGU6ICdBY3Rpb24gQnV0dG9ucycsXG4gICAgICAgIGl0ZW1zOiBBY3Rpb25CdXR0b24uanNvblNjaGVtYVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICB1aVNjaGVtYToge1xuICAgIHRpdGxlOiB7XG4gICAgICAndWk6d2lkZ2V0JzogJ3RleHRhcmVhJ1xuICAgIH0sXG4gICAgc3VidGl0bGU6IHtcbiAgICAgICd1aTp3aWRnZXQnOiAndGV4dGFyZWEnXG4gICAgfVxuICB9LFxuXG4gIGNvbXB1dGVQcmV2aWV3VGV4dDogZm9ybURhdGEgPT4gYENhcmQ6ICR7Zm9ybURhdGEudGl0bGV9YCxcbiAgcmVuZGVyRWxlbWVudDogKGRhdGEsIGNoYW5uZWwpID0+IENhcm91c2VsLnJlbmRlckVsZW1lbnQoeyBpdGVtczogW2RhdGFdLCAuLi5kYXRhIH0sIGNoYW5uZWwpXG59XG4iXX0=