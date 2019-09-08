# wow-state-machine

像多线程那样去轮询多个状态，不同的状态满足后去执行不同的定时任务。

该状态机基本是为写游戏自动脚本量身定做，它就是整个脚本的"调度中心"。即使是基于 Node.js 的单线程，你也能够实现"同时"检测角色血条，掉落物品，游戏状态等等各种来触发不同的操作，搭配 [dm.dll](/documents/dm.dll/) 食用更佳！

[文档地址](https://aweiu.com/documents/wow-state-machine/)
