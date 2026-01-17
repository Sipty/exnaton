# The plan:
- Data exploration:
    ✅ Plot data on a day/night visual - its likely to be related to energy consumtion/ production :)
    ✅ Plot and visualize auto-correlation for the specific data.

## Backend
- Spin up a local DB. 
- Download data and populate DB with it.
- Create a beautiful API with lots of docs

## Frontend
- Build up a beautiful Frontend with a House backdrop and interactive components
- Data should be loaded dynamically
- Add some analysis tooling on the frontend:
    - At a basic level - add a library for data analysis/ visualization, for more profficient users. 
    - I also think adding a chat window, allowing for an agent to access and converse against the data would be pretty cool. 

## Deployment:
- We want to handle multi-tenancy - user accounts would be good, along some kind of oauth
- Vertical scaling should be enough for this, but sit down and think through the whole stack.
- Create an excalidraw with architecture, once decided.