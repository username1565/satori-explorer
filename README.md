# Cirquity Blockchain Explorer
Block explorer for Cirquity, CryptoNote based cryptocurrency.

#### Installation

1) It takes data from daemon cirquityd. It should be accessible from the Internet. Run cirquityd with open port as follows:
```bash
./cirquityd --enable-cors="*" --enable_blockexplorer --rpc-bind-ip=0.0.0.0 --rpc-bind-port=18128
```
2) Just upload to your website and change 'api' variable in config.js to point to your daemon.


### Development
Devs:
    @deeterd

### Note
Forked from Turtlecoin Block Explorer
A lot of this code is from the great Karbovanets/Karbowanec-Blockchain-Explorer
