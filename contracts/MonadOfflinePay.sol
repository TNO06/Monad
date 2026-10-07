// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MonadOfflinePay {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct Voucher {
        uint256 amount;
        string nonce;
        uint256 expiry;
        bytes signature;
    }

    IERC20 public paymentToken;
    
    // payer => merchant => allowedAmount
    mapping(address => mapping(address => uint256)) public allowances;
    // nonce => bool
    mapping(string => bool) public usedNonces;

    event AllowanceLocked(address indexed payer, address indexed merchant, uint256 amount);
    event VoucherSettled(address indexed payer, address indexed merchant, uint256 amount, string nonce);

    constructor(address _paymentToken) {
        paymentToken = IERC20(_paymentToken);
    }

    // Payer locks funds for a specific merchant while online
    function lockAllowance(address merchant, uint256 amount) external {
        require(paymentToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        allowances[msg.sender][merchant] += amount;
        emit AllowanceLocked(msg.sender, merchant, amount);
    }

    // Merchant submits batched offline vouchers to settle
    function settleVouchers(Voucher[] calldata vouchers) external {
        for (uint i = 0; i < vouchers.length; i++) {
            Voucher memory v = vouchers[i];
            
            require(block.timestamp <= v.expiry, "Voucher expired");
            require(!usedNonces[v.nonce], "Nonce already used");
            
            // Construct the message that was signed
            bytes32 messageHash = keccak256(abi.encodePacked(v.amount, v.nonce, v.expiry, address(this)));
            bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
            
            // Recover signer
            address payer = ethSignedMessageHash.recover(v.signature);
            
            require(allowances[payer][msg.sender] >= v.amount, "Insufficient allowance");
            
            // Update state
            usedNonces[v.nonce] = true;
            allowances[payer][msg.sender] -= v.amount;
            
            // Transfer funds to merchant
            require(paymentToken.transfer(msg.sender, v.amount), "Transfer failed");
            
            emit VoucherSettled(payer, msg.sender, v.amount, v.nonce);
        }
    }
}
