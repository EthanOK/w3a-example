import {
  createWalletClient,
  createPublicClient,
  custom,
  formatEther,
  parseEther,
} from "viem";
import { mainnet, polygonAmoy, bscTestnet } from "viem/chains";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IProvider } from "@web3auth/base";

export default class EthereumRpc {
  private provider: IProvider;

  private contractABI = [
    {
      inputs: [],
      name: "retrieve",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "num",
          type: "uint256",
        },
      ],
      name: "store",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  constructor(provider: IProvider) {
    this.provider = provider;
  }

  getViewChain() {
    switch (this.provider.chainId) {
      case "1":
        return mainnet;
      case "0x13882":
        return polygonAmoy;
      case "0x61":
        return bscTestnet;
      default:
        return mainnet;
    }
  }

  async getChainId(): Promise<any> {
    try {
      const walletClient = createWalletClient({
        transport: custom(this.provider),
      });

      const address = await walletClient.getAddresses();
      const chainId = await walletClient.getChainId();
      return chainId.toString();
    } catch (error) {
      return error;
    }
  }

  async getAddresses(): Promise<any> {
    try {
      const walletClient = createWalletClient({
        chain: mainnet,
        transport: custom(this.provider),
      });

      return await walletClient.getAddresses();
    } catch (error) {
      return error;
    }
  }
  async getAccounts(): Promise<any> {
    try {
      const address = this.getAddresses();

      return address;
    } catch (error) {
      return error;
    }
  }

  async getPrivateKey(): Promise<any> {
    try {
      const privateKey = await this.provider.request({
        method: "eth_private_key",
      });

      return privateKey;
    } catch (error) {
      return error as string;
    }
  }

  async getBalance(): Promise<string> {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: custom(this.provider),
    });

    const address = await this.getAccounts();
    const balance = await publicClient.getBalance({ address: address[0] });
    console.log(balance);
    return formatEther(balance);
  }

  async sendTransaction(): Promise<any> {
    const publicClient = createPublicClient({
      chain: this.getViewChain(),
      transport: custom(this.provider),
    });

    const walletClient = createWalletClient({
      chain: this.getViewChain(),
      transport: custom(this.provider),
    });

    // data for the transaction
    const destination = "0x6278A1E803A76796a3A1f7F6344fE874ebfe94B2";
    const amount = parseEther("0.0001");
    const address = await this.getAccounts();

    // Submit transaction to the blockchain
    const hash = await walletClient.sendTransaction({
      account: address[0],
      to: destination,
      value: amount,
    });

    console.log(hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(receipt.toString(), receipt, "1");

    return this.toObject(receipt);
  }

  async signMessage() {
    const publicClient = createPublicClient({
      chain: this.getViewChain(),
      transport: custom(this.provider),
    });

    const walletClient = createWalletClient({
      chain: this.getViewChain(),
      transport: custom(this.provider),
    });

    // data for signing
    const address = await this.getAccounts();
    console.log(address);

    const originalMessage = "YOUR_MESSAGE";

    // Sign the message
    const hash = await walletClient.signMessage({
      account: address[0],
      message: originalMessage,
    });

    const domain = {
      name: "Ether Mail",
      version: "1",
      chainId: 97,
      verifyingContract: address[0],
    };

    // The named list of all type definitions
    const types = {
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" },
      ],
      Mail: [
        { name: "from", type: "Person" },
        { name: "to", type: "Person" },
        { name: "contents", type: "string" },
      ],
    };
    const [account] = await walletClient.getAddresses();
    const signature = await walletClient.signTypedData({
      account,
      domain,
      types,
      primaryType: "Mail",
      message: {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello, Bob!",
      },
    });
    console.log(signature);

    console.log(hash);

    return hash.toString();
  }

  async readContract() {
    const publicClient = createPublicClient({
      chain: this.getViewChain(),
      transport: custom(this.provider),
    });

    const number = await publicClient.readContract({
      address: "0x9554a5CC8F600F265A89511e5802945f2e8A5F5D",
      abi: this.contractABI,
      functionName: "retrieve",
    });

    return this.toObject(number);
  }

  async writeContract() {
    const publicClient = createPublicClient({
      chain: this.getViewChain(),
      transport: custom(this.provider),
    });

    const walletClient = createWalletClient({
      chain: this.getViewChain(),
      transport: custom(this.provider),
    });

    // data for writing to the contract
    const address = await this.getAccounts();
    const randomNumber = Math.floor(Math.random() * 9000) + 1000;

    // Submit transaction to the blockchain
    const hash = await walletClient.writeContract({
      account: address[0],
      address: "0x9554a5CC8F600F265A89511e5802945f2e8A5F5D",
      abi: this.contractABI,
      functionName: "store",
      args: [randomNumber],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(receipt.toString(), receipt, "1");

    return this.toObject(receipt);
  }

  toObject(data: any) {
    // can't serialize a BigInt so this hack
    return JSON.parse(
      JSON.stringify(
        data,
        (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
      )
    );
  }
}
