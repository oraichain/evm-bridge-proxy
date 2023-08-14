// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./IGravity.sol";

contract Bridge is Initializable, OwnableUpgradeable {
    event Amount(string description, uint amount);
    event Address(string description, address addy);

    address private constant UNISWAP_V2_ROUTER =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant GRAVITY_BRIDGE_ROUTER =
        0x09Beeedf51AA45718F46837C94712d89B157a9D3;
    address private constant WETH_ADDRESS =
        0xc778417E063141139Fce010982780140Aa0cD5Ab;
    address private constant ORAI_ADDRESS =
        0x4c11249814f11b9346808179Cf06e71ac328c1b5;

    mapping(address => bool) private preferredFeeCurrencies;

    function initialize() public initializer {
        __Ownable_init_unchained();
        preferredFeeCurrencies[ORAI_ADDRESS] = true;
        preferredFeeCurrencies[WETH_ADDRESS] = true;
    }

    function isPreferred(address _currency) private view returns (bool) {
        return preferredFeeCurrencies[_currency];
    }

    function addPreferredCurrencyForFees(address _currency) public onlyOwner {
        preferredFeeCurrencies[_currency] = true;
    }

    function bridgeFromETH(
        address _tokenOut,
        uint _amountOutMin,
        string calldata _destination
    ) external payable {
        AddressUpgradeable.sendValue(payable(WETH_ADDRESS), msg.value); //wrap ETH as WETH (comes back automatically)
        uint amountToReturn = swap(
            WETH_ADDRESS,
            _tokenOut,
            msg.value,
            _amountOutMin
        );
        backToWallet(_tokenOut, amountToReturn);
        IGravity(GRAVITY_BRIDGE_ROUTER).sendToCosmos(
            _tokenOut,
            _destination,
            amountToReturn
        );
    }

    function bridgeFromERC20(
        address _tokenIn,
        address _tokenOut,
        uint _amountIn,
        uint _amountOutMin,
        string calldata _destination
    ) external payable {
        TransferHelper.safeTransferFrom(
            _tokenIn,
            msg.sender,
            address(this),
            _amountIn
        );
        uint amountReceived = swap(
            _tokenIn,
            _tokenOut,
            _amountIn,
            _amountOutMin
        );
        backToWallet(_tokenOut, amountReceived);

        IGravity(GRAVITY_BRIDGE_ROUTER).sendToCosmos(
            _tokenOut,
            _destination,
            amountReceived
        );
    }

    function backToWallet(address _tokenOut, uint _amount) private {
        TransferHelper.safeApprove(_tokenOut, address(this), _amount);
        TransferHelper.safeTransferFrom(
            _tokenOut,
            address(this),
            msg.sender,
            _amount
        );
    }

    function swap(
        address _tokenIn,
        address _tokenOut,
        uint _amountIn,
        uint _amountOutMin
    ) private returns (uint amountOfTokenOut) {
        TransferHelper.safeApprove(_tokenIn, UNISWAP_V2_ROUTER, _amountIn);

        address[] memory path;
        if (_tokenIn == WETH_ADDRESS || _tokenOut == WETH_ADDRESS) {
            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = _tokenOut;
        } else {
            path = new address[](3);
            path[0] = _tokenIn;
            path[1] = WETH_ADDRESS;
            path[2] = _tokenOut;
        }

        bool feeHasBeenSubtracted = false;
        // if the input token is already in one our preferred currencies, subtract the fee right away
        if (isPreferred(_tokenIn)) {
            uint edgeFee = SafeMathUpgradeable.div(_amountIn, 200); // Charge a swap fee of .5% up front
            _amountIn = _amountIn - edgeFee;
            feeHasBeenSubtracted = true;
        }

        uint[] memory amounts = IUniswapV2Router02(UNISWAP_V2_ROUTER)
            .swapExactTokensForTokens(
                _amountIn,
                _amountOutMin,
                path,
                address(this),
                block.timestamp
            );

        uint amountToReturn = amounts[amounts.length - 1]; // if multiple hops were involved, the final amount will be in the last element

        if (!feeHasBeenSubtracted) {
            uint edgeFee = SafeMathUpgradeable.div(amountToReturn, 200); // Charge a swap fee of .5%
            amountToReturn = amountToReturn - edgeFee;
        }

        return amountToReturn;
    }

    function withdrawExoticFees(
        address _token,
        address _recipient
    ) external onlyOwner {
        ERC20Upgradeable tokenRequested = ERC20Upgradeable(_token);
        TransferHelper.safeApprove(
            _token,
            address(this),
            tokenRequested.balanceOf(address(this))
        ); //may be able to remove this or approve all common tokens once in the constructor
        TransferHelper.safeTransferFrom(
            _token,
            address(this),
            _recipient,
            tokenRequested.balanceOf(address(this))
        );
    }

    function withdrawFees() external {
        // AddressUpgradeable.sendValue(payable(owner()), address(this).balance); // in case we have any ETH

        sendTokenBalanceToOwner(WETH_ADDRESS);
        sendTokenBalanceToOwner(ORAI_ADDRESS);
    }

    function sendTokenBalanceToOwner(address tokenToWithdraw) private {
        ERC20Upgradeable tokenAsContract = ERC20Upgradeable(tokenToWithdraw);
        if (tokenAsContract.balanceOf(address(this)) < 1000) return;
        TransferHelper.safeApprove(
            tokenToWithdraw,
            address(this),
            tokenAsContract.balanceOf(address(this))
        );
        TransferHelper.safeTransferFrom(
            tokenToWithdraw,
            address(this),
            payable(owner()),
            tokenAsContract.balanceOf(address(this))
        );
    }
}
