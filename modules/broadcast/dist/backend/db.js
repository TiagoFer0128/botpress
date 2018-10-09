"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _moment = _interopRequireDefault(require("moment"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class BroadcastDb {
  constructor(bp) {
    this.bp = bp;

    _defineProperty(this, "knex", void 0);

    this.knex = bp.database;
  }

  initialize() {
    if (!this.knex) {
      throw new Error('you must initialize the database before');
    }

    return this.knex.createTableIfNotExists('broadcast_schedules', function (table) {
      table.increments('id').primary();
      table.string('date_time');
      table.timestamp('ts');
      table.string('text');
      table.string('type');
      table.boolean('outboxed');
      table.boolean('errored');
      table.integer('total_count');
      table.integer('sent_count');
      table.timestamp('created_on');
      table.string('filters');
    }).then(() => {
      return this.knex.createTableIfNotExists('broadcast_outbox', function (table) {
        table.integer('scheduleId').references('broadcast_schedules.id').onDelete('CASCADE');
        table.string('userId').references('srv_channel_users.user_id');
        table.primary(['scheduleId', 'userId']);
        table.timestamp('ts');
      });
    });
  }

  addSchedule({
    date,
    time,
    timezone,
    content,
    type,
    filters
  }) {
    const dateTime = date + ' ' + time;
    let ts = undefined;

    if (timezone) {
      ts = (0, _moment.default)(new Date(dateTime + ' ' + timezone)).toDate();
    }

    const row = {
      date_time: dateTime,
      ts: ts ? this.knex.date.format(ts) : undefined,
      text: content,
      type: type,
      outboxed: false,
      errored: false,
      total_count: 0,
      sent_count: 0,
      created_on: this.knex.date.now(),
      filters: JSON.stringify(filters)
    };
    return this.knex('broadcast_schedules').insert(row, 'id').then().get(0);
  }

  updateSchedule({
    id,
    date,
    time,
    timezone,
    content,
    type,
    filters
  }) {
    const dateTime = date + ' ' + time;
    let ts = undefined;

    if (timezone) {
      ts = (0, _moment.default)(new Date(dateTime + ' ' + timezone)).toDate();
    }

    const row = {
      date_time: dateTime,
      ts: ts ? this.knex.date.format(ts) : undefined,
      text: content,
      type: type,
      filters: JSON.stringify(filters)
    };
    return this.knex('broadcast_schedules').where({
      id: id,
      outboxed: this.knex.bool.false()
    }).update(row).then();
  }

  deleteSchedule(id) {
    return this.knex('broadcast_schedules').where({
      id: id
    }).delete().then(() => {
      return this.knex('broadcast_outbox').where({
        scheduleId: id
      }).del().then(() => true);
    });
  }

  listSchedules() {
    return this.knex('broadcast_schedules').then();
  }

}

exports.default = BroadcastDb;