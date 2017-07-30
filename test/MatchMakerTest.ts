import * as assert from 'assert';
import { MatchMaker } from "../src/MatchMaker";
import { Room } from "../src/Room";
import { createDummyClient, DummyRoom } from "./utils/mock";

describe('MatchMaker', function () {
  let matchMaker: MatchMaker;

  before(function () {
    matchMaker = new MatchMaker()
    matchMaker.addHandler('room', DummyRoom);
    matchMaker.addHandler('dummy_room', DummyRoom);
  });

  describe('room handlers', function () {
    it('should add handler with name', function () {
      assert.equal(DummyRoom, matchMaker['handlers'].room[0]);
      assert.equal(0, Object.keys(matchMaker['handlers'].room[1]).length);
      assert.equal(false, matchMaker.hasAvailableRoom('room'));
    });

    it('should create a new room on joinOrCreateByName', function () {
      var client = createDummyClient()
      var roomPromise = matchMaker.joinOrCreateByName(client, 'room', {})
      roomPromise.then(room => {
        assert.equal(0, room.roomId)
        assert.equal(1, Object.keys(matchMaker['roomsById']).length)
      })

    });

    it('shouldn\'t return when trying to join with invalid room id', function () {
      var client = createDummyClient()
      assert.equal(matchMaker.joinById(client, 100), undefined);
    });

    it('shouldn\'t create room when trying to join room with invalid params', function () {
      var client = createDummyClient()
      matchMaker.joinOrCreateByName(client, 'dummy_room', { invalid_param: 10 })
        .then(room => {
          assert.equal(room, null)
        })
    });

    it('should throw error when trying to join existing room by id with invalid params', function () {
      var client1 = createDummyClient()
      var client2 = createDummyClient()

      matchMaker.joinOrCreateByName(client1, 'room', {}).then(room => {
        assert.equal(matchMaker.joinById(client2, room.roomId, { invalid_param: 1 }), undefined);
      })
    });

    it('should join existing room on joinById', function () {
      assert.equal(false, matchMaker.hasAvailableRoom('dummy_room'))

      var client1 = createDummyClient()
      var client2 = createDummyClient()

      matchMaker.joinOrCreateByName(client1, 'dummy_room', {})
        .then(room => {
          var joiningRoom = matchMaker.joinById(client2, room.roomId, {})

          assert.equal(true, matchMaker.hasAvailableRoom('dummy_room'))
          assert.equal('dummy_room', room.roomName)
          assert.equal(room.roomId, joiningRoom.roomId)
        })
    });

  });
});
