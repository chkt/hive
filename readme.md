# Hive alpha

## Install

### Standalone
```sh
git clone git@gitlab.com:chktone/hive-alpha.git
cd hive-alpha
npm install
npm run build
```

### As submodule

```sh
git commit -am 'All open changes commited'
git submodule add git@gitlab.com:chktone/hive-alpha.git ./<submoduleRoot>/hive
git commit -am 'Add hive alpha submodule'
cd <submoduleRoot>/hive
npm install
npm run build
```
