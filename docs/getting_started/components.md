---
layout: guide
---

Botpress can seem intimidating at first, but it is in fact very simple once you understand how it works and why. Let’s dissect all the major components of a Botpress bot.

## Modules <a class="toc" id="modules" href="#modules"></a>

A module is an extra component outside of the Botpress Core itself that you can install in your bot to add new features to Botpress. Every bot use modules in a way, since almost everything in Botpress is a module. This architecture allows for maximum flexibility and freedom for developers. There are three informal categories of modules: **channels**, **skills** and **functionals**.

## Channels <a class="toc" id="channels" href="#channels"></a>

A **channel** is a kind of module that allows your bot to receive and send messages from a specific chat platform (Slack, Facebook Messenger, Telegram, etc).

> **Note**: Unlike most other bot platforms, channels are installed and configured individually and locally, which means you have full control over the data that is transmitted between your bot and the chat platforms. Botpress does not proxy the messages to a 3rd party service like Microsoft Bot Framework does.

Behind the scene, Botpress implements a queuing mechanism that processes ingoing and outgoing messages sequentially. If a message fails to be processed or sent for some reason, the message will be retried before raising an error to the developer and bot administrator.

## NLU <a class="toc" id="nlu" href="#nlu"></a>

**Natural Language Understanding** (or simply **NLU**) is the part where your bot takes the messages received from the chat platforms, which are pure unstructured text, and transforms them into structured data that your bot will be able to work with.

Although NLU is totally optional, a bot without NLU would have to rely on obsolete techniques such as keywords detection in order to process the incoming messages and reply correctly.

NLU is a subset of NLP (_Natural Language Processing_) and is in general a very complex subject involving linguistics and machine learning. Fortunately, there are many providers that allow us to abstract all these complexities, such as [LUIS](https://luis.ai) (Microsoft), [DialogFlow](https://dialogflow.com/) (Google), [IBM Watson](https://www.ibm.com/watson/services/natural-language-understanding/) and [RASA](https://github.com/RasaHQ/rasa_nlu).

NLU is available in Botpress by installing a module called [`botpress-nlu`](https://github.com/botpress/botpress-nlu), which provides such functionality by connecting to any of these providers.

## Dialogue Manager <a class="toc" id="dialogue" href="#dialogue"></a>

Once you’ve received text from a chat platform and transformed that text into structured data, the next piece to be involved is the **Dialogue Manager** (or simply **DM**). The role of the DM is to determine what the bot should do or say next. 

Although the Dialogue Manager could theoretically be implemented as a bunch of “If” and “Else” statements, this technique does not scale well in practice, because the unpredictability of natural dialogues increases the complexity of this kind of state machines exponentially.

Botpress solves this problem by combining an extensible Visual Flow Editor with a powerful Dialogue Manager, which abstracts and eliminate the real complexity behind such State Machines.

## Content Elements (and Content Renderers) <a class="toc" id="content" href="#content"></a>

Now that the DM has decided that your bot should reply with a certain message, there is one missing piece piece of information missing before the message is effectively sent out to the user: what kind of message should it send and how is that message going to be rendered on the different chat platforms?

That is what **Content Elements** are for. A Content Element can be seen as a structured object that holds information about what to say, and a Content Renderer is a function that transforms that structured object into a platform-specific message.

The purpose of a Content Renderer is to allow developers to specify how the same information should behave (i.e. be displayed) on the different chat platforms.

## Summary

Channels, which are a special kind of module, receive messages from the different chat platforms. These messages are then processed by NLU so that the natural text is turned into structured data the bot understands. The Dialog Manager decides what the bot needs to say next, which the Content Renderer turns into a message specific to the target chat platform.

![Components Overview][components]

[components]: /docs/assets/guides/components.svg
