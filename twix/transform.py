from . import key, pattern, extract
import os
import json
from typing import Dict, List, Set, Any

def identify_unique_templates(data: Dict[str, List[Dict]]) -> Dict[str, Set[str]]:
    """
    Identify unique templates from the extracted data.
    Returns a dictionary mapping document names to sets of template signatures.
    """
    template_map = {}
    
    for doc_name, content_list in data.items():
        template_map[doc_name] = set()
        
        for item in content_list:
            for content_item in item.get('content', []):
                if content_item['type'] == 'table':
                    # For tables, use column headers as template signature
                    for table_entry in content_item['content']:
                        template_signature = frozenset(table_entry.keys())
                        template_map[doc_name].add(template_signature)
                        break  # We only need one entry to get the headers
                elif content_item['type'] == 'kv':
                    # For key-value pairs, use the keys as template signature
                    kv_keys = set()
                    for kv_entry in content_item['content']:
                        kv_keys.update(kv_entry.keys())
                    template_map[doc_name].add(frozenset(kv_keys))
                    
    return template_map

def aggregate_template_data(data: Dict[str, List[Dict]], template_signatures: Dict[str, Set[str]]) -> Dict[str, Dict[str, List[Dict]]]:
    """
    Aggregate data for each unique template.
    Returns a dictionary mapping document names to template data.
    """
    aggregated_data = {}
    
    for doc_name, content_list in data.items():
        aggregated_data[doc_name] = {
            'templates': {},
            'sequential': content_list  # Preserve sequential data
        }
        
        for signature in template_signatures[doc_name]:
            signature_str = ','.join(sorted(signature))  # Convert frozenset to string for dict key
            aggregated_data[doc_name]['templates'][signature_str] = []
            
            # Collect all matching data for this template
            for item in content_list:
                for content_item in item.get('content', []):
                    if content_item['type'] == 'table':
                        for table_entry in content_item['content']:
                            if frozenset(table_entry.keys()) == signature:
                                aggregated_data[doc_name]['templates'][signature_str].append({
                                    'type': 'table',
                                    'content': [table_entry]
                                })
                    elif content_item['type'] == 'kv':
                        kv_keys = set()
                        for kv_entry in content_item['content']:
                            kv_keys.update(kv_entry.keys())
                        if frozenset(kv_keys) == signature:
                            aggregated_data[doc_name]['templates'][signature_str].append(content_item)
                            
    return aggregated_data
    
#This is end-to-end APIs that directly extract data from raw documents
def transform(pdf_paths, result_folder_path, LLM_model_name, vision_feature = False):
    total_cost = 0
    phrases, cost = extract.extract_phrase(pdf_paths, result_folder_path, LLM_model_name=LLM_model_name, vision_feature=vision_feature)
    total_cost += cost 
    fields, cost = key.predict_field(pdf_paths, result_folder_path, LLM_model_name=LLM_model_name)
    total_cost += cost 
    template, cost = pattern.predict_template(pdf_paths, result_folder_path, LLM_model_name=LLM_model_name)
    total_cost += cost 
    extraction_objects, cost = pattern.extract_data(pdf_paths, result_folder_path)
    
    # Process the extracted data to identify templates and aggregate data
    template_signatures = identify_unique_templates(extraction_objects)
    aggregated_data = aggregate_template_data(extraction_objects, template_signatures)
    
    # Save the aggregated data
    output_path = os.path.join(result_folder_path, 'aggregated_data.json')
    with open(output_path, 'w') as f:
        json.dump(aggregated_data, f, indent=2)
    
    total_cost += cost 
    return fields, template, aggregated_data, cost 
