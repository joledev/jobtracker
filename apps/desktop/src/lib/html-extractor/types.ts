export type FieldAssignment = 'none' | 'position' | 'company' | 'salary' | 'level' | 'type' | 'modality' | 'location' | 'notes'

export interface ExtractedNode {
  id: string
  text: string
  truncatedText: string
  tagName: string
  assignment: FieldAssignment
}
