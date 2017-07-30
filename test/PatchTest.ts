import * as assert from "assert";
import * as msgpack from "msgpack-lite";
import { Room } from "../src/Room";
import { createDummyClient, DummyRoom } from "./utils/mock";
import { Protocol } from "../src/Protocol";

describe('Patch', function () {
  let room: Room<any>;

  beforeEach(function (done) {
    room = new DummyRoom();
    room.setState({});
    room.onInit().then(done);
  })

  describe('patch interval', function () {
    var room = new DummyRoom();
    room.setState({});
    room.onInit().then(() => {
      assert.equal("object", typeof ((<any>room)._patchInterval))
      assert.equal(1000 / 20, (<any>room)._patchInterval._idleTimeout, "default patch rate should be 20")
    })

  })

  describe('simulation interval', function () {
    it('simulation shouldn\'t be initialized by default', function () {
      assert.equal(typeof ((<any>room)._simulationInterval), "undefined");
    })
    it('allow setting simulation interval', function () {
      room.setSimulationInterval(() => { }, 1000 / 60);
      assert.equal("object", typeof ((<any>room)._simulationInterval));
      assert.equal(1000 / 60, (<any>room)._simulationInterval._idleTimeout);
    })
  })

  describe('#sendState', function () {
    it('should allow null and undefined values', function () {
      let room = new DummyRoom();
      room.setState({});
      let client = createDummyClient();

      room.setState({ n: null, u: undefined });
      (<any>room)._onJoin(client, {});

      var message = msgpack.decode(client.messages[1]);
      assert.equal(message[0], Protocol.ROOM_STATE);
      assert.deepEqual(message[2], { n: null, u: null });
    })
  })

});
