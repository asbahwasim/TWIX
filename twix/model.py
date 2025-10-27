import os, sys

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from .models.gpt_4o import gpt_4o
from .models.gpt_4o_mini import gpt_4o_mini
from .models.gpt_4o_vision import gpt_4o_vision
from .models.gpt_4o_mini_vision import gpt_4o_mini_vision
from .models.gpt_41_mini_azure import gpt_41_mini_azure

#this is the models API. You pass the model (name of the model) and prompt, the API will return the response out 
def model(model_name, prompt, image_path = ''):
    if(model_name == 'gpt-4o'):
        return gpt_4o(prompt)
    if(model_name == 'vision-gpt-4o'):
        return gpt_4o_vision(image_path,prompt)
    if(model_name == 'vision-gpt-4o-mini'):
        return gpt_4o_mini_vision(image_path,prompt)
    if(model_name == 'gpt-4o-mini'):
        return gpt_4o_mini(prompt)
    if(model_name == 'gpt-4.1-mini-azure'):
        # Azure model can handle any input format
        return gpt_41_mini_azure(prompt)
    return 'input model does not exist'



