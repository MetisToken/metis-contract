const { assert } = require("chai");

const MTS = artifacts.require("MTS");
contract("MTS", (accounts) => {
  const [
    owner,
    ordinary,
    burner,
    locker,
    transferred,
    locked,
    locked2,
    // timeLocked1,
    // timeLocked2,
    // investorLocked1,
    // investorLocked2,
  ] = accounts;
  const BigNumber = web3.BigNumber;

  const timeTravel = async function(seconds) {
    await evmIncreaseTime(seconds);
    await evmMine();
  };
  const evmIncreaseTime = function(seconds) {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [seconds], //86,400 is num seconds in day
          id: new Date().getTime(),
        },
        (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        }
      );
    });
  };
  const evmMine = function() {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_mine",
          params: [],
          id: new Date().getTime(),
        },
        (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        }
      );
    });
  };

  require("chai")
    .use(require("chai-as-promised"))
    .use(require("chai-bignumber")(BigNumber))
    .should();

  describe("1. owner  test", () => {
    it("1-1 should put 1200000000 MTS in the owner account", async () => {
      let mts = await MTS.deployed();
      let balance = await mts.balanceOf(owner);
      assert.equal(
        balance.valueOf(),
        1200000000000000000000000000,
        "1200000000 wasn't in the owner account"
      );
    });
    it("1-2 should hidden owner account is same as owner account", async () => {
      let mts = await MTS.deployed();
      let hiddenOwnerAddress = await mts.hiddenOwner();
      assert.equal(hiddenOwnerAddress, owner, "owner is not hidden owner");
    });
  });
  describe("2. transfer test", () => {
    it("2-1 should transfer 1000 token to transferred", async () => {
      let mts = await MTS.deployed();
      let amount = 1000000;
      await mts.transfer(transferred, amount, { from: owner });
      let balance = await mts.balanceOf(transferred);
      assert.equal(amount, balance.valueOf(), "transfer failed");
    });
  });
  describe("3. burner test", () => {
    it("3-1 should set burner properly by owner", async () => {
      let mts = await MTS.deployed();
      let isBurner = false;

      isBurner = await mts.isBurner(burner);
      assert.isFalse(isBurner, "burner should not be added");

      try {
        await mts.addBurner(burner, { from: ordinary });
      } catch (e) {}
      isBurner = await mts.isBurner(burner);
      assert.isFalse(isBurner, "burner should not be added");

      await mts.addBurner(burner, { from: owner });
      isBurner = await mts.isBurner(burner);
      assert.isTrue(isBurner, "burner should be added");

      try {
        await mts.removeBurner(burner, { from: ordinary });
      } catch (e) {}
      isBurner = await mts.isBurner(burner);
      assert.isTrue(isBurner, "burner should not be removed");

      isBurner = await mts.removeBurner(burner, { from: owner });
      isBurner = await mts.isBurner(burner);
      assert.isFalse(isBurner, "burner should be removed");
    });
    it("3-2 should burn", async () => {
      let mts = await MTS.deployed();
      let transferredAmount = 2000000;
      let burnedAmount = 1000000;
      let balance = 0;
      let isBurner = false;

      await mts.addBurner(burner, { from: owner });
      isBurner = await mts.isBurner(burner);
      assert.isTrue(isBurner, "burner should be added");

      await mts.transfer(burner, transferredAmount, { from: owner });
      balance = await mts.balanceOf(burner);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");

      await mts.burn(burnedAmount, { from: burner });
      balance = await mts.balanceOf(burner);
      assert.equal(
        transferredAmount - burnedAmount,
        balance.valueOf(),
        "burned failed"
      );

      isBurner = await mts.removeBurner(burner, { from: owner });
      isBurner = await mts.isBurner(burner);
      assert.isFalse(isBurner, "burner should be removed");
    });
  });
  describe("4. locker test", () => {
    it("4-1 should lock and unlock properly by owner", async () => {
      let mts = await MTS.deployed();
      let isLocker = false;
      isLocker = await mts.isLocker(locker);
      assert.isFalse(isLocker, "locker should not be added");
      try {
        await mts.addLocker(locker, { from: ordinary });
      } catch (e) {}
      isLocker = await mts.isLocker(locker);
      assert.isFalse(isLocker, "locker should not be added");
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      try {
        await mts.removeLocker(locker, { from: ordinary });
      } catch (e) {}
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should not be removed");
      isLocker = await mts.removeLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isFalse(isLocker, "locker should be removed");
    });
    it("4-2 should lock and transfer", async () => {
      let mts = await MTS.deployed();
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await mts.transfer(locked, lockedAmount, { from: owner });
      balance = await mts.balanceOf(locked);
      assert.equal(lockedAmount, balance.valueOf(), "transfer failed");
      await mts.lock(locked, { from: locker });
      try {
        await mts.transfer(owner, lockedAmount, { from: locked });
      } catch (e) {}
      balance = await mts.balanceOf(locked);
      assert.equal(lockedAmount, balance.valueOf(), "transferred");
      await mts.unlock(locked, { from: owner });
      await mts.transfer(owner, lockedAmount, { from: locked });
      balance = await mts.balanceOf(locked);
      assert.equal(0, balance.valueOf(), "transferred");
    });
    it("4-3 should time lock add and remove work right", async () => {
      let mts = await MTS.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Date.now();
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      let timeLockInfo = [];
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await mts.transfer(locked, transferredAmount, { from: owner });
      balance = await mts.balanceOf(locked);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await mts.addTimeLock(locked, lockedAmount, now + 300, { from: locker });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount,
        "time locked amount is different"
      );
      await mts.addTimeLock(locked, lockedAmount + 100, now + 400, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 2 + 100,
        "time locked amount is different"
      );
      await mts.addTimeLock(locked, lockedAmount + 200, now + 500, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 3, "time locked: 3 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 3 + 300,
        "time locked amount is different"
      );
      await mts.addTimeLock(locked, lockedAmount + 300, now + 600, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 4, "time locked: 4 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 4 + 600,
        "time locked amount is different"
      );
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 1);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 100,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 400, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 2);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 200,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 500, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 3);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 300,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      try {
        await mts.removeTimeLock(locked, 2, { from: locker });
      } catch (e) {}
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 4, "time locked: 4 time");
      await mts.removeTimeLock(locked, 1, { from: owner });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 3, "time locked: 3 time");
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 1);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 300,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 2);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 200,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 500, "expiredAt is not set well");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 3 + 500,
        "time locked amount is different"
      );
      await mts.removeTimeLock(locked, 2, { from: owner });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 1);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 300,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 2 + 300,
        "time locked amount is different"
      );
      await mts.removeTimeLock(locked, 0, { from: owner });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 1, "time locked: 2 time");
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 300,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount + 300,
        "time locked amount is different"
      );
      await mts.addTimeLock(locked, lockedAmount + 100, now + 400, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 2 + 400,
        "time locked amount is different"
      );
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 300,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 1);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 100,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 400, "expiredAt is not set well");
    });
    it("4-4 should time lock and transfer", async () => {
      let mts = await MTS.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Date.now();
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await mts.transfer(locked2, transferredAmount, { from: owner });
      balance = await mts.balanceOf(locked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await mts.addTimeLock(locked2, lockedAmount * 4 + 100, now + 300, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked2);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked2);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 4 + 100,
        "time locked amount is different"
      );
      try {
        await mts.transfer(owner, lockedAmount, { from: locked2 });
      } catch (e) {}
      balance = await mts.balanceOf(locked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await mts.transfer(owner, lockedAmount - 100, { from: locked2 });
      balance = await mts.balanceOf(locked2);
      assert.equal(
        transferredAmount - lockedAmount + 100,
        balance.valueOf(),
        "transfer failed"
      );
    });
    it("4-5 should time lock expires", async () => {
      let mts = await MTS.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Math.round(new Date().getTime() / 1000);
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await mts.transfer(locked, transferredAmount, { from: owner });
      balance = await mts.balanceOf(locked);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await mts.addTimeLock(locked, lockedAmount * 4 + 100, now + 2, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 4 + 100,
        "time locked amount is different"
      );
      try {
        await mts.transfer(owner, lockedAmount, { from: locked });
      } catch (e) {}
      balance = await mts.balanceOf(locked);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount * 4 + 100,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 2, "expiredAt is not set well");
      await timeTravel(3);
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, 0, "time locked amount is different");
      await mts.transfer(owner, lockedAmount, { from: locked });
      balance = await mts.balanceOf(locked);
      assert.equal(
        transferredAmount - lockedAmount,
        balance.valueOf(),
        "transfer failed"
      );
    });
  });
  describe("4. locker test", () => {
    it("4-1 should lock and unlock properly by owner", async () => {
      let mts = await MTS.deployed();
      let isLocker = false;
      isLocker = await mts.isLocker(locker);
      assert.isFalse(isLocker, "locker should not be added");
      try {
        await mts.addLocker(locker, { from: ordinary });
      } catch (e) {}
      isLocker = await mts.isLocker(locker);
      assert.isFalse(isLocker, "locker should not be added");
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      try {
        await mts.removeLocker(locker, { from: ordinary });
      } catch (e) {}
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should not be removed");
      isLocker = await mts.removeLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isFalse(isLocker, "locker should be removed");
    });
    it("4-2 should lock and transfer", async () => {
      let mts = await MTS.deployed();
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await mts.transfer(locked, lockedAmount, { from: owner });
      balance = await mts.balanceOf(locked);
      assert.equal(lockedAmount, balance.valueOf(), "transfer failed");
      await mts.lock(locked, { from: locker });
      try {
        await mts.transfer(owner, lockedAmount, { from: locked });
      } catch (e) {}
      balance = await mts.balanceOf(locked);
      assert.equal(lockedAmount, balance.valueOf(), "transferred");
      await mts.unlock(locked, { from: owner });
      await mts.transfer(owner, lockedAmount, { from: locked });
      balance = await mts.balanceOf(locked);
      assert.equal(0, balance.valueOf(), "transferred");
    });
    it("4-3 should time lock add and remove work right", async () => {
      let mts = await MTS.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Date.now();
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      let timeLockInfo = [];
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await mts.transfer(locked, transferredAmount, { from: owner });
      balance = await mts.balanceOf(locked);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await mts.addTimeLock(locked, lockedAmount, now + 300, { from: locker });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount,
        "time locked amount is different"
      );
      await mts.addTimeLock(locked, lockedAmount + 100, now + 400, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 2 + 100,
        "time locked amount is different"
      );
      await mts.addTimeLock(locked, lockedAmount + 200, now + 500, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 3, "time locked: 3 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 3 + 300,
        "time locked amount is different"
      );
      await mts.addTimeLock(locked, lockedAmount + 300, now + 600, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 4, "time locked: 4 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 4 + 600,
        "time locked amount is different"
      );
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 1);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 100,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 400, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 2);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 200,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 500, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 3);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 300,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      try {
        await mts.removeTimeLock(locked, 2, { from: locker });
      } catch (e) {}
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 4, "time locked: 4 time");
      await mts.removeTimeLock(locked, 1, { from: owner });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 3, "time locked: 3 time");
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 1);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 300,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 2);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 200,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 500, "expiredAt is not set well");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 3 + 500,
        "time locked amount is different"
      );
      await mts.removeTimeLock(locked, 2, { from: owner });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 1);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 300,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 2 + 300,
        "time locked amount is different"
      );
      await mts.removeTimeLock(locked, 0, { from: owner });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 1, "time locked: 2 time");
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 300,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount + 300,
        "time locked amount is different"
      );
      await mts.addTimeLock(locked, lockedAmount + 100, now + 400, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 2 + 400,
        "time locked amount is different"
      );
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 300,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockInfo = await mts.getTimeLock(locked, 1);
      assert.equal(
        timeLockInfo[0],
        lockedAmount + 100,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 400, "expiredAt is not set well");
    });
    it("4-4 should time lock and transfer", async () => {
      let mts = await MTS.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Date.now();
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await mts.transfer(locked2, transferredAmount, { from: owner });
      balance = await mts.balanceOf(locked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await mts.addTimeLock(locked2, lockedAmount * 4 + 100, now + 300, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked2);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked2);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 4 + 100,
        "time locked amount is different"
      );
      try {
        await mts.transfer(owner, lockedAmount, { from: locked2 });
      } catch (e) {}
      balance = await mts.balanceOf(locked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await mts.transfer(owner, lockedAmount - 100, { from: locked2 });
      balance = await mts.balanceOf(locked2);
      assert.equal(
        transferredAmount - lockedAmount + 100,
        balance.valueOf(),
        "transfer failed"
      );
    });
    it("4-5 should time lock expires", async () => {
      let mts = await MTS.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Math.round(new Date().getTime() / 1000);
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await mts.transfer(locked, transferredAmount, { from: owner });
      balance = await mts.balanceOf(locked);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await mts.addTimeLock(locked, lockedAmount * 4 + 100, now + 2, {
        from: locker,
      });
      timeLockLength = await mts.getTimeLockLength(locked);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(
        timeLockedAmount,
        lockedAmount * 4 + 100,
        "time locked amount is different"
      );
      try {
        await mts.transfer(owner, lockedAmount, { from: locked });
      } catch (e) {}
      balance = await mts.balanceOf(locked);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      timeLockInfo = await mts.getTimeLock(locked, 0);
      assert.equal(
        timeLockInfo[0],
        lockedAmount * 4 + 100,
        "time locked amount is not set well"
      );
      assert.equal(timeLockInfo[1], now + 2, "expiredAt is not set well");
      await timeTravel(3);
      timeLockedAmount = await mts.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, 0, "time locked amount is different");
      await mts.transfer(owner, lockedAmount, { from: locked });
      balance = await mts.balanceOf(locked);
      assert.equal(
        transferredAmount - lockedAmount,
        balance.valueOf(),
        "transfer failed"
      );
    });
    it("4-6 should investor lock add and remove work right", async () => {
      let mts = await MTS.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 5000000;
      let balance = 0;
      let isLocker = false;
      let now = Date.now();
      let months = 5;
      let investorLockedAmount = 0;
      let investorLockInfo = null;
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await mts.transfer(locked, transferredAmount, { from: owner });
      balance = await mts.balanceOf(locked);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await mts.addInvestorLock(locked, months, {
        from: locker,
      });
      investorLockedAmount = await mts.getInvestorLockedAmount(locked);
      assert.equal(
        investorLockedAmount,
        lockedAmount,
        "investor locked amount is different"
      );
      investorLockInfo = await mts.getInvestorLock(locked);
      assert.equal(
        investorLockInfo[0],
        lockedAmount,
        "investor locked amount is not set well"
      );
      assert.equal(
        investorLockInfo[1],
        months,
        "investor locked months is not set well"
      );
      try {
        await mts.removeInvestorLock(locked, { from: locker });
      } catch (e) {}
      investorLockInfo = await mts.getInvestorLock(locked);
      assert.equal(
        investorLockInfo[0],
        lockedAmount,
        "investor locked amount is not set well"
      );
      investorLockedAmount = await mts.getInvestorLockedAmount(locked);
      assert.equal(
        investorLockedAmount,
        lockedAmount,
        "investor locked amount is different"
      );
      try {
        await mts.removeInvestorLock(locked, { from: owner });
      } catch (e) {}
      investorLockInfo = await mts.getInvestorLock(locked);
      assert.equal(
        investorLockInfo[0],
        0,
        "investor locked amount is not set well"
      );
      investorLockedAmount = await mts.getInvestorLockedAmount(locked);
      assert.equal(
        investorLockedAmount,
        0,
        "investor locked amount is different"
      );
    });
    it("4-7 should investor lock and transfer", async () => {
      let mts = await MTS.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 5000000;
      let months = 5;
      let balance = 0;
      let isLocker = false;
      let now = Date.now();
      let investorLockedAmount = 0;
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await mts.transfer(locked2, transferredAmount, { from: owner });
      balance = await mts.balanceOf(locked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await mts.addInvestorLock(locked2, months, {
        from: locker,
      });
      investorLockedAmount = await mts.getInvestorLockedAmount(locked2);
      assert.equal(
        investorLockedAmount,
        lockedAmount,
        "investor locked amount is different"
      );
      try {
        await mts.transfer(owner, lockedAmount, { from: locked2 });
      } catch (e) {}
      balance = await mts.balanceOf(locked2);
      assert.equal(
        transferredAmount,
        balance.valueOf(),
        "transfer lock failed"
      );
    });
    it("4-8 should investor lock expires", async () => {
      let mts = await MTS.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 5000000;
      let balance = 0;
      let months = 5;
      let isLocker = false;
      let oneMonthToSec = 60 * 60 * 24 * 31;
      let releasedAmountPerMonth = 1000000;
      let investorLockedAmount = 0;
      await mts.addLocker(locker, { from: owner });
      isLocker = await mts.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await mts.transfer(locked2, transferredAmount, { from: owner });
      balance = await mts.balanceOf(locked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await mts.addInvestorLock(locked2, months, {
        from: locker,
      });
      investorLockedAmount = await mts.getInvestorLockedAmount(locked2);
      assert.equal(
        investorLockedAmount,
        lockedAmount,
        "investor locked amount is different"
      );
      try {
        await mts.transfer(owner, lockedAmount, { from: locked2 });
      } catch (e) {}
      balance = await mts.balanceOf(locked2);
      assert.equal(
        transferredAmount,
        balance.valueOf(),
        "transfer lock failed"
      );
      await timeTravel(oneMonthToSec + 1);
      investorLockedAmount = await mts.getInvestorLockedAmount(locked2);
      console.log(
        "time traveled investor locked amount",
        parseInt(investorLockedAmount, 10)
      );
      assert.equal(
        investorLockedAmount,
        lockedAmount - releasedAmountPerMonth,
        "investor locked amount is different"
      );
      await mts.transfer(owner, releasedAmountPerMonth, { from: locked2 });
      balance = await mts.balanceOf(locked2);
      assert.equal(
        transferredAmount - releasedAmountPerMonth,
        balance.valueOf(),
        "transfer failed"
      );
    });
  });
});
