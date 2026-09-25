# frozen_string_literal: true

module Admin
  class BugReportsController < BaseController
    before_action :set_bug_report, except: [:index]

    def index
      authorize :bug_report, :index?
      @status = params[:status].presence_in(%w(open resolved))
      @bug_reports = filtered_bug_reports.page(params[:page])
    end

    def show
      authorize @bug_report, :show?
      @media_attachments = @bug_report.media_attachments.order(:id)
    end

    def assign_to_self
      authorize @bug_report, :update?
      @bug_report.update!(assigned_account: current_account)
      redirect_to admin_bug_report_path(@bug_report)
    end

    def unassign
      authorize @bug_report, :update?
      @bug_report.update!(assigned_account: nil)
      redirect_to admin_bug_report_path(@bug_report)
    end

    def reopen
      authorize @bug_report, :update?
      @bug_report.reopen!
      redirect_to admin_bug_report_path(@bug_report)
    end

    def resolve
      authorize @bug_report, :update?
      @bug_report.resolve!(current_account)
      redirect_to admin_bug_reports_path, notice: I18n.t('admin.bug_reports.resolved_msg')
    end

    private

    def filtered_bug_reports
      scope = BugReport.recent.includes(:account, :assigned_account, :resolved_by_account, :media_attachments)
      @status.present? ? scope.public_send(@status) : scope
    end

    def set_bug_report
      @bug_report = BugReport.includes(:account, :assigned_account, :resolved_by_account, :media_attachments).find(params[:id])
    end
  end
end
