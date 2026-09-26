class AddGeneratorToStatuses < ActiveRecord::Migration[8.1]
  def change
    add_column :statuses, :generator_name, :string
    add_column :statuses, :generator_url, :text
  end
end
