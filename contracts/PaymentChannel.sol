// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <=0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PaymentChannel is ERC20 {
    mapping(uint256 => bool) usedNonces;
    event UpdateBalance(
        address from,
        address to,
        uint256 messageValue,
        uint256 amount,
        bytes senderSignature,
        bytes receiverSignature
    );

    constructor(uint256 initialSupply) public ERC20("TST", "TST") {
        _mint(msg.sender, initialSupply);
    }

    function updateBalances(
        address _from,
        address to,
        uint256 amount,
        uint256 nonce,
        bytes memory senderSignature,
        bytes memory receiverSignature
    ) public payable {
        require(_from != to, "You can't send funds to yourself!");
        require(
            msg.value == amount,
            "You need to send the total amount of the transfer to the contract"
        );
        // Protect against question #2 (older receipt version)
        require(!usedNonces[nonce]);
        usedNonces[nonce] = true;
        // Check receipt validity
        // Get message hash
        bytes32 message = prefixed(
            keccak256(abi.encodePacked(_from, to, amount, nonce))
        );
        // Check each user's signature
        require(
            recoverSigner(message, senderSignature) == _from,
            "Sender signature does not match message's signature"
        );
        require(
            recoverSigner(message, receiverSignature) == to,
            "Receiver signature does not match message's signature"
        );
        // Send the funds
        transferFrom(_from, to, msg.value);
        // emit event to listeners
        emit UpdateBalance(
            _from,
            to,
            msg.value,
            amount,
            senderSignature,
            receiverSignature
        );
    }

    // Gives us v,r,s of the passed signature
    function splitSignature(bytes memory sig)
        internal
        pure
        returns (
            uint8 v,
            bytes32 r,
            bytes32 s
        )
    {
        require(sig.length == 65);

        assembly {
            // first 32 bytes, after the length prefix.
            r := mload(add(sig, 32))
            // second 32 bytes.
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes).
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    // Gives us a message signer's address
    function recoverSigner(bytes32 message, bytes memory sig)
        public
        pure
        returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);

        return ecrecover(message, v, r, s);
    }

    /// builds a prefixed hash to mimic the behavior of eth_sign.
    function prefixed(bytes32 hash) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
            );
    }
}
