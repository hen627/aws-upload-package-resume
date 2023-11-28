This is part of the backend of my personal site, the connection to Supabase requires it's own separate SQL code which I have not included here.

What this backend does is accept user input from the frontend, convert user input into vector data using openAI's ada model then sends that to Supabase, the SQL code is then ran on Supabase to determine the appropriate response to send back. A request is then sent to Chatgpt to further refine the answer to make sure it matches the users query. 

To get it running you need your own openAI account with money in it, you need to set up supabase as well, and lastly you need a frontend to both accept input and display output.

That is the basics to get it running, but you also need a tool to convert and store the information you want the user to be able to query into the database, otherwise there is nothing for the user to retreive. In my case I have a separate tool that I use to convert the data to a vector format and store it in supabase.

-----------

Use localtesting to adjust prompts for chatgpt testing and sql database.
use index.js to update and upload to aws.

commonheaders are depricated, need to be adjusted.

All env keys are in aws lambda.

Supabase sql setup is separate and not part of the package.

/Resumeweb is the frontend to this backend.
