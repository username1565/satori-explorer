# Satori Blockchain Explorer
Block explorer for Satori, CryptoNote based cryptocurrency.

#### Installation

1) It takes data from daemon satorid. It should be accessible from the Internet. Run satorid with open port as follows:
```bash
./Satorid --enable-cors="*" --enable-blockexplorer --rpc-bind-ip=0.0.0.0 --rpc-bind-port=17898
```
2) Just upload to your website and change 'api' variable in config.js to point to your daemon.


### Development
Devs:
    @meaa

### Note
Forked from Turtlecoin Block Explorer
A lot of this code is from the great Karbovanets/Karbowanec-Blockchain-Explorer
