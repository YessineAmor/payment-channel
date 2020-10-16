var PaymentChannel = artifacts.require("./PaymentChannel.sol");

module.exports = function(deployer) {
  deployer.deploy(PaymentChannel);
};
